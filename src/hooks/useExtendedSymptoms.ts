import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { IS_DEV_MODE } from '../lib/devMode';
import { getDevExtendedSymptomLogs, setDevExtendedSymptomLogs } from '../lib/devStore';

export function useExtendedSymptoms() {
  const [isLoading, setIsLoading] = useState(false);

  const deleteByCheckinId = useCallback(async (checkinId: string) => {
    if (IS_DEV_MODE) {
      setDevExtendedSymptomLogs(
        getDevExtendedSymptomLogs().filter((l) => l.checkin_id !== checkinId),
      );
      console.log('[DEV] Extended symptoms deleted for checkin:', checkinId);
      return true;
    }

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
