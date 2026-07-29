/** Shared Check In due treatment — distinct from selected-tab chrome. */
export const CHECKIN_DUE_NAV =
  'checkin-due-nav rounded-full bg-sage-500 font-semibold text-on-accent shadow-sm';

export function checkinDueWord(): string {
  return 'Check-In Due';
}

export function CheckinDueDot() {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-on-accent ring-2 ring-sage-500"
      aria-hidden
    />
  );
}
