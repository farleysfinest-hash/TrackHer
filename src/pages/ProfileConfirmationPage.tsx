import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TimezoneSelect } from '../components/ui/TimezoneSelect';
import { useProfile } from '../hooks/useProfile';
import { getActiveTimezone, isValidTimeZone } from '../utils/localDate';

export function ProfileConfirmationPage() {
  const navigate = useNavigate();
  const { profile, update, isUpdating } = useProfile();
  const [hasUterus, setHasUterus] = useState<boolean | null>(
    profile?.has_uterus_confirmed_at ? profile.has_uterus : null,
  );
  const [timezone, setTimezone] = useState(
    profile?.timezone_confirmed_at && profile.timezone
      ? profile.timezone
      : getActiveTimezone(profile?.timezone),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasUterus === null) {
      setError('Please select Yes or No.');
      return;
    }
    if (!isValidTimeZone(timezone)) {
      setError('Please select a valid time zone.');
      return;
    }

    setError(null);
    const confirmedAt = new Date().toISOString();
    const result = await update({
      has_uterus: hasUterus,
      has_uterus_confirmed_at: confirmedAt,
      timezone,
      timezone_confirmed_at: confirmedAt,
    });
    if (!result.success) {
      setError(result.error ?? 'Could not save your answers.');
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12">
      <Card>
        <h1 className="font-display text-2xl text-sage-800">Confirm two profile details</h1>
        <p className="mt-2 text-sm leading-relaxed text-sage-500">
          Earlier versions of TrackHer supplied defaults for these answers. Please confirm them so
          we never treat an assumed location or clinical detail as fact.
        </p>

        <form className="mt-6 space-y-6" onSubmit={handleSave}>
          <div>
            <p className="mb-2 text-sm font-medium text-sage-700">
              Do you currently have your uterus? (required)
            </p>
            <div className="flex gap-3">
              {([true, false] as const).map((answer) => (
                <button
                  key={String(answer)}
                  type="button"
                  onClick={() => setHasUterus(answer)}
                  className={[
                    'flex-1 rounded-lg border px-4 py-3 text-sm font-medium',
                    hasUterus === answer
                      ? 'border-sage-500 bg-sage-50 text-sage-700'
                      : 'border-sand-200 text-sage-600',
                  ].join(' ')}
                >
                  {answer ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          <TimezoneSelect value={timezone} onChange={setTimezone} />

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth isLoading={isUpdating} loadingText="Saving...">
            Confirm and continue
          </Button>
        </form>
      </Card>
    </main>
  );
}
