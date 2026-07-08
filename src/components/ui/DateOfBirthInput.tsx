import { useEffect, useId, useRef, useState } from 'react';
import {
  DOB_MIN_YEAR,
  buildIsoDate,
  digitsOnly,
  getDobMaxYear,
  isValidDobIso,
  parseIsoDate,
} from '../../utils/dateOfBirth';

interface DateOfBirthInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  error?: string;
  minYear?: number;
}

const fieldClass = [
  'rounded-lg border bg-white py-3 text-center text-sage-800',
  'placeholder:text-sand-400',
  'transition-colors duration-150',
  'focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-500/20',
  'border-sand-200',
].join(' ');

export function DateOfBirthInput({
  label,
  value,
  onChange,
  helperText,
  error,
  minYear = DOB_MIN_YEAR,
}: DateOfBirthInputProps) {
  const baseId = useId();
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const skipSyncRef = useRef(false);

  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    const parsed = parseIsoDate(value);
    setMonth(parsed.month);
    setDay(parsed.day);
    setYear(parsed.year);
    setLocalError(null);
  }, [value]);

  const emitChange = (nextMonth: string, nextDay: string, nextYear: string) => {
    skipSyncRef.current = true;

    if (!nextMonth && !nextDay && !nextYear) {
      setLocalError(null);
      onChange('');
      return;
    }

    const iso = buildIsoDate(nextMonth, nextDay, nextYear);
    if (!iso) {
      if (nextMonth.length === 2 && nextDay.length === 2 && nextYear.length === 4) {
        setLocalError('Please enter a valid date');
      } else {
        setLocalError(null);
      }
      onChange('');
      return;
    }

    if (!isValidDobIso(iso, minYear)) {
      const y = parseInt(nextYear, 10);
      if (y < minYear) {
        setLocalError(`Year must be ${minYear} or later`);
      } else if (y > getDobMaxYear()) {
        setLocalError('Date of birth cannot be in the future');
      } else {
        setLocalError('Please enter a valid date');
      }
      onChange('');
      return;
    }

    setLocalError(null);
    onChange(iso);
  };

  const handleMonthChange = (raw: string) => {
    const nextMonth = digitsOnly(raw, 2);
    setMonth(nextMonth);
    emitChange(nextMonth, day, year);
    if (nextMonth.length === 2) {
      dayRef.current?.focus();
      dayRef.current?.select();
    }
  };

  const handleDayChange = (raw: string) => {
    const nextDay = digitsOnly(raw, 2);
    setDay(nextDay);
    emitChange(month, nextDay, year);
    if (nextDay.length === 2) {
      yearRef.current?.focus();
      yearRef.current?.select();
    }
  };

  const handleYearChange = (raw: string) => {
    const nextYear = digitsOnly(raw, 4);
    setYear(nextYear);
    emitChange(month, day, nextYear);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    segment: 'month' | 'day' | 'year',
  ) => {
    if (e.key !== 'Backspace') return;

    const target = e.currentTarget;
    if (target.selectionStart !== 0 || target.selectionEnd !== 0) return;

    if (segment === 'day' && day === '') {
      e.preventDefault();
      monthRef.current?.focus();
    } else if (segment === 'year' && year === '') {
      e.preventDefault();
      dayRef.current?.focus();
    }
  };

  const displayError = error ?? localError;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={`${baseId}-month`} className="mb-1.5 block text-sm font-medium text-sage-700">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={monthRef}
          id={`${baseId}-month`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-month"
          placeholder="MM"
          maxLength={2}
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'month')}
          aria-label="Birth month"
          className={[fieldClass, 'w-16', displayError ? 'border-danger' : ''].filter(Boolean).join(' ')}
        />
        <span className="text-sage-400" aria-hidden="true">
          /
        </span>
        <input
          ref={dayRef}
          id={`${baseId}-day`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="DD"
          maxLength={2}
          value={day}
          onChange={(e) => handleDayChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'day')}
          aria-label="Birth day"
          className={[fieldClass, 'w-16', displayError ? 'border-danger' : ''].filter(Boolean).join(' ')}
        />
        <span className="text-sage-400" aria-hidden="true">
          /
        </span>
        <input
          ref={yearRef}
          id={`${baseId}-year`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="YYYY"
          maxLength={4}
          value={year}
          onChange={(e) => handleYearChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 'year')}
          aria-label="Birth year"
          className={[fieldClass, 'w-24', displayError ? 'border-danger' : ''].filter(Boolean).join(' ')}
        />
      </div>
      {displayError && <p className="mt-1.5 text-sm text-danger">{displayError}</p>}
      {helperText && !displayError && <p className="mt-1.5 text-sm text-sage-400">{helperText}</p>}
    </div>
  );
}
