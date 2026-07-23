interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  /** Extra classes for subtext (e.g. positive moss accent). Default: text-sage-400. */
  subtextClassName?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
    isPositive: boolean;
  };
  color?: string;
  /** `'card'` = bordered tile (default). `'cell'` = bare metric for nested grids. */
  variant?: 'card' | 'cell';
}

function isLongNonNumericValue(value: string | number): boolean {
  if (typeof value === 'number') return false;
  const trimmed = value.trim();
  if (trimmed === '—' || /^-?\d+(\.\d+)?$/.test(trimmed)) return false;
  return trimmed.length > 8;
}

export function StatCard({
  label,
  value,
  subtext,
  subtextClassName = 'text-sage-400',
  trend,
  color,
  variant = 'card',
}: StatCardProps) {
  const trendColor = trend
    ? trend.isPositive
      ? 'text-moss-700'
      : 'text-sage-600'
    : '';

  const valueSize = isLongNonNumericValue(value) ? 'text-xl' : 'text-3xl';

  return (
    <div
      className={
        variant === 'cell'
          ? 'p-4'
          : 'rounded-xl border border-sand-200 bg-sand-50 p-4 shadow-sm'
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-sage-400">{label}</p>
      <p
        className={`mt-1 select-none font-display ${valueSize} font-semibold text-sage-800`}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {subtext && <p className={`text-sm ${subtextClassName}`}>{subtext}</p>}
      {trend && (
        <p className={`mt-1 text-sm font-medium ${trendColor}`}>{trend.label}</p>
      )}
    </div>
  );
}
