import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor';

/** RevenueCat entitlement identifier — create this exact id in the dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro';

export type SubscriptionStatus = {
  configured: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
};

let configured = false;
let cachedIsPro = false;
let cachedCustomerInfo: CustomerInfo | null = null;

function iosApiKey(): string | undefined {
  const key = import.meta.env.VITE_REVENUECAT_IOS_API_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
}

export function isSubscriptionsConfigured(): boolean {
  return Boolean(iosApiKey()) && Capacitor.isNativePlatform();
}

/**
 * When RevenueCat is not configured (web, missing key), Pro stays unlocked so
 * private beta and browser use are not blocked. Once a native key is set,
 * access requires the `pro` entitlement.
 */
export function hasProAccess(): boolean {
  if (!isSubscriptionsConfigured()) return true;
  return cachedIsPro;
}

export function getSubscriptionSnapshot(): SubscriptionStatus {
  return {
    configured: isSubscriptionsConfigured(),
    isPro: hasProAccess(),
    customerInfo: cachedCustomerInfo,
  };
}

function updateCache(info: CustomerInfo | null): void {
  cachedCustomerInfo = info;
  const entitlement = info?.entitlements.active[PRO_ENTITLEMENT_ID];
  cachedIsPro = Boolean(entitlement);
}

export async function initializeSubscriptions(appUserId?: string | null): Promise<void> {
  const apiKey = iosApiKey();
  if (!apiKey || !Capacitor.isNativePlatform()) {
    configured = false;
    return;
  }
  if (configured) {
    if (appUserId) await identifySubscriber(appUserId);
    return;
  }

  try {
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    await Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });
    configured = true;
    const { customerInfo } = await Purchases.getCustomerInfo();
    updateCache(customerInfo);
  } catch (err) {
    console.error('RevenueCat configure failed:', err);
    configured = false;
  }
}

export async function identifySubscriber(appUserId: string): Promise<void> {
  if (!configured) return;
  try {
    const { customerInfo } = await Purchases.logIn({ appUserID: appUserId });
    updateCache(customerInfo);
  } catch (err) {
    console.error('RevenueCat logIn failed:', err);
  }
}

export async function refreshCustomerInfo(): Promise<SubscriptionStatus> {
  if (!configured) return getSubscriptionSnapshot();
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    updateCache(customerInfo);
  } catch (err) {
    console.error('RevenueCat getCustomerInfo failed:', err);
  }
  return getSubscriptionSnapshot();
}

export async function restorePurchases(): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
  userCancelled?: boolean;
}> {
  if (!configured) {
    return { success: false, isPro: true, error: 'Subscriptions are not configured on this build.' };
  }
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    updateCache(customerInfo);
    return { success: true, isPro: hasProAccess() };
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : undefined;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, isPro: hasProAccess(), userCancelled: true };
    }
    const message = err instanceof Error ? err.message : 'Could not restore purchases.';
    return { success: false, isPro: hasProAccess(), error: message };
  }
}

export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!configured) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.error('RevenueCat getOfferings failed:', err);
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  isPro: boolean;
  error?: string;
  userCancelled?: boolean;
}> {
  if (!configured) {
    return { success: false, isPro: true, error: 'Subscriptions are not configured on this build.' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    updateCache(customerInfo);
    return { success: true, isPro: hasProAccess() };
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code: string }).code
        : undefined;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, isPro: hasProAccess(), userCancelled: true };
    }
    const message = err instanceof Error ? err.message : 'Purchase failed.';
    return { success: false, isPro: hasProAccess(), error: message };
  }
}

/** Call before account deletion so RevenueCat can stop associating the device. */
export async function logOutSubscriber(): Promise<void> {
  if (!configured) return;
  try {
    const { customerInfo } = await Purchases.logOut();
    updateCache(customerInfo);
  } catch (err) {
    console.error('RevenueCat logOut failed:', err);
  }
}
