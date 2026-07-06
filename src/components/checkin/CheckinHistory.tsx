import { useCallback, useEffect, useRef, useState } from 'react';
import { useCheckins } from '../../hooks/useCheckins';
import type { SymptomCheckin } from '../../types/database';
import { CheckinHistoryCard } from './CheckinHistoryCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';

interface CheckinHistoryProps {
  onViewDetails: (checkin: SymptomCheckin) => void;
}

type DateRange = '7' | '30' | '90' | 'all';

export function CheckinHistory({ onViewDetails }: CheckinHistoryProps) {
  const { fetchCheckinsPage } = useCheckins();
  const [items, setItems] = useState<SymptomCheckin[]>([]);
  const [range, setRange] = useState<DateRange>('30');
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const offsetRef = useRef(0);

  const filterByRange = useCallback(
    (rows: SymptomCheckin[]) => {
      if (range === 'all') return rows;
      const days = Number(range);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return rows.filter((r) => new Date(r.checkin_date) >= cutoff);
    },
    [range],
  );

  const load = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      const newOffset = reset ? 0 : offsetRef.current;
      const { data, hasMore: more } = await fetchCheckinsPage(newOffset, 10);
      const filtered = filterByRange(data);
      setItems((prev) => (reset ? filtered : [...prev, ...filtered]));
      setHasMore(more);
      offsetRef.current = (reset ? 0 : newOffset) + 10;
      setIsLoading(false);
    },
    [fetchCheckinsPage, filterByRange],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-sage-800">Your Check-in History</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as DateRange)}
          className="rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm text-sage-700"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All</option>
        </select>
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-sage-400">No check-ins in this period yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((checkin) => (
            <CheckinHistoryCard key={checkin.id} checkin={checkin} onViewDetails={onViewDetails} />
          ))}
        </div>
      )}

      {hasMore && (
        <Button variant="secondary" onClick={() => void load(false)} disabled={isLoading}>
          Load more
        </Button>
      )}
    </div>
  );
}
