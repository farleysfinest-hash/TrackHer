import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PaywallModal } from '../subscription/PaywallModal';
import { useProGate } from '../../hooks/useProGate';
import { useSubscription } from '../../hooks/useSubscription';

/**
 * Subscription controls for Settings. Until RevenueCat + App Store products are
 * configured, this explains the upcoming Pro tier without blocking the beta.
 */
export function SubscriptionSettingsCard() {
  const { configured, isPro } = useSubscription();
  const { paywallOpen, paywallReason, openPaywall, closePaywall } = useProGate();

  if (!configured) {
    return (
      <Card>
        <h2 className="font-display text-xl text-sage-800">TrackHer Pro</h2>
        <p className="mt-2 text-sm text-sage-500">
          Coming soon on iOS: before/after HRT analysis, unlimited history, lab overlays, and
          provider reports. Logging, reminders, and daily pulse stay free.
        </p>
        <p className="mt-3 text-xs text-sage-400">
          Planned pricing: $7.99/month or $59.99/year (14-day trial on annual).
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-xl text-sage-800">TrackHer Pro</h2>
      <p className="mt-2 text-sm text-sage-500">
        {isPro
          ? 'Your Pro subscription is active. Thank you for supporting TrackHer.'
          : 'Unlock automatic before/after HRT windows, unlimited history, lab overlays, and provider reports.'}
      </p>

      {!isPro && (
        <div className="mt-4">
          <Button
            fullWidth
            onClick={() =>
              openPaywall(
                'See what changed after your HRT changed—plus provider reports and long history.',
              )
            }
          >
            View plans
          </Button>
        </div>
      )}

      <div className="mt-4">
        <Button
          variant="secondary"
          onClick={() => openPaywall('Restore a previous TrackHer Pro purchase.')}
        >
          Restore purchases
        </Button>
      </div>

      <PaywallModal isOpen={paywallOpen} onClose={closePaywall} reason={paywallReason} />
    </Card>
  );
}
