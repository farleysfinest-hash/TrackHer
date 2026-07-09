import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { MOCK_USER } from '../lib/mockData';
import { getDevQuickLogs, setDevQuickLogs } from '../lib/devStore';
import { useAuthStore } from '../stores/authStore';
import type { QuickLogEvent, QuickLogEventInsert } from '../types/database';

export function useQuickLog() {
  const [events, setEvents] = useState<QuickLogEvent[]>(
    IS_DEV_MODE ? [...getDevQuickLogs()] : [],
  );
  const [isLoading, setIsLoading] = useState(!IS_DEV_MODE);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchEvents = useCallback(async (limit = 50) => {
    if (IS_DEV_MODE) {
      const sorted = [...getDevQuickLogs()].sort((a, b) =>
        b.logged_at.localeCompare(a.logged_at),
      );
      setEvents(sorted.slice(0, limit));
      setIsLoading(false);
      return;
    }

    const userId = getUserId();
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('quick_log_events')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);

    setIsLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setEvents((data as QuickLogEvent[]) ?? []);
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(
    async (input: QuickLogEventInsert): Promise<QuickLogEvent | null> => {
      const userId = getUserId();
      if (!userId) return null;

      if (IS_DEV_MODE) {
        const event: QuickLogEvent = {
          id: `ql-dev-${Date.now()}`,
          user_id: MOCK_USER.id,
          symptom_id: input.symptom_id,
          severity: input.severity ?? null,
          logged_at: input.logged_at ?? new Date().toISOString(),
          duration_minutes: input.duration_minutes ?? null,
          trigger_tag: input.trigger_tag ?? null,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
        };
        setDevQuickLogs([event, ...getDevQuickLogs()]);
        setEvents([event, ...events]);
        return event;
      }

      const { data, error: insertError } = await supabase
        .from('quick_log_events')
        .insert({ ...input, user_id: userId })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      const created = data as QuickLogEvent;
      setEvents((prev) => [created, ...prev]);
      return created;
    },
    [events],
  );

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    if (IS_DEV_MODE) {
      setDevQuickLogs(getDevQuickLogs().filter((e) => e.id !== id));
      setEvents((prev) => prev.filter((e) => e.id !== id));
      return true;
    }

    const { error: deleteError } = await supabase.from('quick_log_events').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    return true;
  }, []);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    deleteEvent,
  };
}
