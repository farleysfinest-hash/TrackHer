import { useCallback, useState } from 'react';
import { hasProAccess, isSubscriptionsConfigured } from '../lib/subscriptions';
import { useSubscription } from './useSubscription';

/**
 * Opens the paywall when Pro is required and the user is not entitled.
 * When RevenueCat is not configured, actions run freely (private beta).
 */
export function useProGate() {
  const { isPro, configured, refresh } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>();

  const requirePro = useCallback(
    (action?: () => void, reason?: string): boolean => {
      if (hasProAccess()) {
        action?.();
        return true;
      }
      setPaywallReason(reason);
      setPaywallOpen(true);
      return false;
    },
    [],
  );

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
    void refresh();
  }, [refresh]);

  return {
    isPro,
    configured: configured || isSubscriptionsConfigured(),
    paywallOpen,
    paywallReason,
    openPaywall: (reason?: string) => {
      setPaywallReason(reason);
      setPaywallOpen(true);
    },
    closePaywall,
    requirePro,
  };
}
