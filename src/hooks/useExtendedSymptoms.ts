import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useExtendedSymptoms() {
  const [isLoading, setIsLoading] = useState(false);

  const deleteByCheckinId = useCallback(async (checkinId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('extended_symptom_logs')
      .delete()
      .eq('checkin_id', checkinId);
    setIsLoading(false);
    return !error;
  }, []);

  return { isLoading, deleteByCheckinId };
}
