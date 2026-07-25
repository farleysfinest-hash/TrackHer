import { useCallback, useEffect, useRef, useState } from 'react';
import { selectionTick } from '../lib/haptics';

/**
 * Owns a chart's selected date and emits one native selection tick only when
 * the date actually changes.
 */
export function useChartSelection(interactive: boolean) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selectedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (interactive) return;
    selectedDateRef.current = null;
    setSelectedDate(null);
  }, [interactive]);

  const selectDate = useCallback((date: string) => {
    if (selectedDateRef.current === date) return;
    selectedDateRef.current = date;
    setSelectedDate(date);
    void selectionTick();
  }, []);

  return { selectedDate, selectDate };
}
