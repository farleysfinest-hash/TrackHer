export const DOB_MIN_YEAR = 1920;

export function getDobMaxYear(): number {
  return new Date().getFullYear();
}

export function parseIsoDate(iso: string): { month: string; day: string; year: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return { month: '', day: '', year: '' };
  }
  const [year, month, day] = iso.split('-');
  return { month, day, year };
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  );
}

export function isValidDobIso(iso: string, minYear = DOB_MIN_YEAR): boolean {
  const { month, day, year } = parseIsoDate(iso);
  if (!month || !day || !year) return false;

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < minYear || y > getDobMaxYear()) return false;
  if (!isValidCalendarDate(y, m, d)) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(y, m - 1, d) <= today;
}

export function buildIsoDate(month: string, day: string, year: string): string | null {
  if (month.length !== 2 || day.length !== 2 || year.length !== 4) return null;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (!isValidCalendarDate(y, m, d)) return null;
  return `${year}-${month}-${day}`;
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}
