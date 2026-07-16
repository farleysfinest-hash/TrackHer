import { useMemo } from 'react';
import { getDeviceTimezone, getSupportedTimezones } from '../../utils/localDate';
import { Select } from './Select';

interface TimezoneSelectProps {
  value: string;
  onChange: (timezone: string) => void;
  label?: string;
  error?: string;
}

function timezoneLabel(timezone: string): string {
  return timezone.replaceAll('_', ' ');
}

export function TimezoneSelect({
  value,
  onChange,
  label = 'Preferred time zone',
  error,
}: TimezoneSelectProps) {
  const deviceTimezone = getDeviceTimezone();
  const options = useMemo(() => {
    const zones = getSupportedTimezones();
    if (value && !zones.includes(value)) zones.push(value);
    return zones.map((timezone) => ({ value: timezone, label: timezoneLabel(timezone) }));
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Select
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={options}
        placeholder="Select a time zone"
        error={error}
      />
      {deviceTimezone && (
        <p className="text-xs text-sage-500">
          This device is currently using {timezoneLabel(deviceTimezone)}. TrackHer uses the current
          device zone for today and for new event logs without silently changing your preference.
        </p>
      )}
    </div>
  );
}
