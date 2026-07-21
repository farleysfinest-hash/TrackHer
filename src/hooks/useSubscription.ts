import { useCallback, useEffect, useState } from 'react';
import {
  getOfferings,
  getSubscriptionSnapshot,
  hasProAccess,
  initializeSubscriptions,
  isSubscriptionsConfigured,
  purchasePackage,
  refreshCustomerInfo,
  restorePurchases,
  type SubscriptionStatus,
} from '../lib/subscriptions';
import { useAuthStore } from '../stores/authStore';
import type { PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';

export function useSubscription() {
  const userId = useAuthStore((s) => s.user?.id);
  const [status, setStatus] = useState<SubscriptionStatus>(() => getSubscriptionSnapshot());
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeSubscriptions(userId);
      if (cancelled) return;
      setStatus(getSubscriptionSnapshot());
      if (isSubscriptionsConfigured()) {
        const next = await getOfferings();
        if (!cancelled) setOfferings(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await refreshCustomerInfo();
      setStatus(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await restorePurchases();
      setStatus(getSubscriptionSnapshot());
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    setIsLoading(true);
    try {
      const result = await purchasePackage(pkg);
      setStatus(getSubscriptionSnapshot());
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    configured: status.configured,
    isPro: hasProAccess(),
    customerInfo: status.customerInfo,
    offerings,
    isLoading,
    refresh,
    restore,
    purchase,
  };
}
