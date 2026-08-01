import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: vi.fn(),
    getCustomerInfo: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    restorePurchases: vi.fn(),
    getOfferings: vi.fn(),
    purchasePackage: vi.fn(),
    setLogLevel: vi.fn(),
  },
  LOG_LEVEL: { DEBUG: 'DEBUG' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 'PURCHASE_CANCELLED_ERROR' },
}));

import {
  hasProAccess,
  isBetaProUnlockEnabled,
  isSubscriptionsConfigured,
} from '../subscriptions';

describe('beta Pro access', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_REVENUECAT_IOS_API_KEY', 'appl_beta_test_key');
    vi.stubEnv('VITE_BETA_UNLOCK_PRO', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps every native beta account unlocked when RevenueCat is configured', () => {
    vi.stubEnv('VITE_BETA_UNLOCK_PRO', 'true');

    expect(isSubscriptionsConfigured()).toBe(true);
    expect(isBetaProUnlockEnabled()).toBe(true);
    expect(hasProAccess()).toBe(true);
  });

  it('does not silently enable the override for other values', () => {
    vi.stubEnv('VITE_BETA_UNLOCK_PRO', 'false');

    expect(isSubscriptionsConfigured()).toBe(true);
    expect(isBetaProUnlockEnabled()).toBe(false);
    expect(hasProAccess()).toBe(false);
  });
});
