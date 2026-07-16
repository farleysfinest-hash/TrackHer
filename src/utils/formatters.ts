import { civilDateToUTCDate } from './localDate';

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const isCivilDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const d = isCivilDate ? civilDateToUTCDate(date) : typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(isCivilDate ? { timeZone: 'UTC' } : {}),
    ...options,
  });
}

export function formatDateLong(date: string | Date): string {
  return formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatLoggingDate(date: string): string {
  const d = civilDateToUTCDate(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}
