import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { QuickLogEvent, QuickLogEventInsert } from '../types/database';

export function useQuickLog() {
  const [events, setEvents] = useState<QuickLogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => useAuthStore.getState().user?.id;

  const fetchEvents = useCallback(async (limit = 50) => {
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
    [],
  );

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
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
