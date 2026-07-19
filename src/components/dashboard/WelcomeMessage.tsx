import { X, Heart } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { hasUiFlag, setUiFlag } from '../../lib/uiState';

export function WelcomeMessage() {
  const profile = useAuthStore((s) => s.profile);

  // Wait for the profile before deciding — prevents a flash of the
  // banner for users who already dismissed it.
  if (!profile) return null;
  if (hasUiFlag(profile, 'welcome_dismissed')) return null;

  const handleDismiss = () => {
    setUiFlag('welcome_dismissed');
  };

  return (
    <Card variant="elevated" className="relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-colors"
        aria-label="Dismiss welcome message"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-4">
        <div className="hidden sm:flex shrink-0 mt-1">
          <div className="rounded-full bg-sage-100 p-3">
            <Heart className="h-6 w-6 text-sage-500" />
          </div>
        </div>

        <div className="space-y-4 pr-6">
          <div>
            <h2 className="font-display text-xl text-sage-800">Welcome to TrackHer</h2>
            <p className="mt-2 text-sage-600 leading-relaxed">
              This app helps you understand how your hormone replacement therapy (HRT/BHRT) is
              actually working, or not working, for <em>you</em>.
            </p>
          </div>

          <p className="text-sage-600 leading-relaxed">
            Hormone balance is a lot like Goldilocks: not too high, not too low, but{' '}
            <em>just right</em>. The trouble is, &ldquo;just right&rdquo; looks different for every
            woman. Your sweet spot, the balance where you sleep better, think more clearly, and feel
            like yourself again, is something only your body can tell you.
          </p>

          <p className="text-sage-600 leading-relaxed">
            That&apos;s what TrackHer is for. By recording your doses, symptoms, and lab results over
            time, you&apos;ll start to see patterns that are invisible day-to-day. Which changes made
            things better. Which made things worse. What your body is actually responding to.
          </p>

          <div>
            <h3 className="font-display text-base font-medium text-sage-700">
              A few tips to get the most out of it:
            </h3>
            <ul className="mt-2 space-y-1.5 text-sage-600">
              <li className="flex gap-2">
                <span className="shrink-0 text-sage-400">&bull;</span>
                <span>
                  Log changes to your HRT as they happen &mdash; dose adjustments, new medications,
                  switching delivery methods.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-sage-400">&bull;</span>
                <span>
                  Check in on your symptoms regularly, even on good days. The contrast is where the
                  insights live.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-sage-400">&bull;</span>
                <span>
                  Add lab results when you get them. Seeing your numbers alongside how you{' '}
                  <em>felt</em> that week tells a story bloodwork alone can&apos;t.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-sage-400">&bull;</span>
                <span>
                  Share your provider report with your doctor. It turns weeks of tracking into a
                  conversation starter.
                </span>
              </li>
            </ul>
          </div>

          <p className="text-sage-600 leading-relaxed">
            There is no one-size-fits-all approach to hormone therapy, and this app won&apos;t
            pretend there is. TrackHer is a tool to help you understand your own body, and a resource
            to bring to the table when you and your provider make decisions together.
          </p>
        </div>
      </div>
    </Card>
  );
}
