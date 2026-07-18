interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
    isPositive: boolean;
  };
  color?: string;
}

export function StatCard({ label, value, subtext, trend, color }: StatCardProps) {
  const trendColor = trend
    ? trend.isPositive
      ? 'text-moss-700'
      : 'text-sage-600'
    : '';

  return (
    <div className="rounded-xl border border-sand-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-sage-400">{label}</p>
      <p
        className="mt-1 select-none font-display text-3xl font-semibold text-sage-800"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {subtext && <p className="text-sm text-sage-400">{subtext}</p>}
      {trend && (
        <p className={`mt-1 text-sm font-medium ${trendColor}`}>{trend.label}</p>
      )}
    </div>
  );
}
