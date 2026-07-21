import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSubscription } from '../../hooks/useSubscription';
import { PRO_ENTITLEMENT_ID } from '../../lib/subscriptions';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Short reason shown under the title, e.g. why they hit the gate. */
  reason?: string;
}

export function PaywallModal({ isOpen, onClose, reason }: PaywallModalProps) {
  const { configured, isPro, isLoading, offerings, purchase, restore } = useSubscription();
  const packages = offerings?.current?.availablePackages ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="TrackHer Pro" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-sage-600">
          {reason ??
            'See what changed after your HRT changed—plus unlimited history, lab overlays, and provider reports.'}
        </p>

        <ul className="space-y-1.5 text-sm text-sage-700">
          <li>Automatic before/after observation windows</li>
          <li>Provider-ready PDF reports</li>
          <li>Correlation insights and long history</li>
          <li>Logging, reminders, and daily pulse stay free</li>
        </ul>

        {!configured && (
          <p className="text-sm text-sage-500">
            Subscriptions are not configured on this build yet. Pro stays unlocked for private beta.
          </p>
        )}

        {configured && isPro && (
          <p className="text-sm text-sage-700">Your Pro subscription is already active.</p>
        )}

        {configured && !isPro && packages.length > 0 && (
          <div className="space-y-2">
            {packages.map((pkg) => (
              <Button
                key={pkg.identifier}
                fullWidth
                isLoading={isLoading}
                loadingText="Starting..."
                onClick={() => {
                  void purchase(pkg).then((result) => {
                    if (result.success && result.isPro) onClose();
                  });
                }}
              >
                {pkg.product.title} — {pkg.product.priceString}
              </Button>
            ))}
          </div>
        )}

        {configured && !isPro && packages.length === 0 && (
          <p className="text-sm text-amber-800">
            Products are not available yet. Confirm the RevenueCat offering includes entitlement
            &ldquo;{PRO_ENTITLEMENT_ID}&rdquo;.
          </p>
        )}

        {configured && (
          <Button
            variant="secondary"
            fullWidth
            isLoading={isLoading}
            loadingText="Restoring..."
            onClick={() => {
              void restore().then((result) => {
                if (result.success && result.isPro) onClose();
              });
            }}
          >
            Restore purchases
          </Button>
        )}

        <Button variant="ghost" fullWidth onClick={onClose}>
          Not now
        </Button>
      </div>
    </Modal>
  );
}
