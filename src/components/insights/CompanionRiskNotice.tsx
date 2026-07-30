/**
 * Soft crisis / mental-health notice for companion surfaces (journal, visit debrief).
 * Uses sage styling — reserved alert-700 ink stays on SafeguardingCard only.
 */
export function CompanionRiskNotice({ reply }: { reply: string }) {
  return (
    <div className="rounded-xl border border-sage-300 bg-sand-50 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-500">Please read</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-sage-800">{reply}</p>
      <p className="mt-3 text-xs text-sage-500">
        In the US, call or text{' '}
        <a href="tel:988" className="font-medium text-sage-700 underline underline-offset-2">
          988
        </a>{' '}
        (Suicide &amp; Crisis Lifeline). Worldwide:{' '}
        <a
          href="https://findahelpline.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sage-700 underline underline-offset-2"
        >
          findahelpline.com
        </a>
        .
      </p>
    </div>
  );
}
