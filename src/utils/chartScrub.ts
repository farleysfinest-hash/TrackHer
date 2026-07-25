export function nearestDateForRatio(
  selectableDates: string[],
  domainDates: string[],
  ratio: number,
): string | null {
  if (selectableDates.length === 0) return null;

  const orderedSelectable = [...new Set(selectableDates)];
  const orderedDomain = [...new Set(domainDates.length > 0 ? domainDates : orderedSelectable)];
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  const targetDomainIndex = clampedRatio * Math.max(0, orderedDomain.length - 1);
  let nearestDate = orderedSelectable[0] ?? null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const date of orderedSelectable) {
    const domainIndex = orderedDomain.indexOf(date);
    if (domainIndex < 0) continue;
    const distance = Math.abs(domainIndex - targetDomainIndex);
    if (distance < nearestDistance) {
      nearestDate = date;
      nearestDistance = distance;
    }
  }

  return nearestDate;
}
