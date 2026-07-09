import { useEffect, useRef } from 'react';
import { useCheckinStore } from '../../stores/checkinStore';
import { useSymptomSelections } from '../../hooks/useSymptomSelections';
import { useQuickLog } from '../../hooks/useQuickLog';
import { useAuthStore } from '../../stores/authStore';
import { getSymptomByKey } from '../../data/symptoms';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';

export function FlareTapRow() {
  const { watchSymptomIds, isLoading: selectionsLoading } = useSymptomSelections();
  const { events, isLoading: eventsLoading } = useQuickLog();
  const flareSelected = useCheckinStore((s) => s.flareSelected);
  const initFlareFromPreLogged = useCheckinStore((s) => s.initFlareFromPreLogged);
  const toggleFlareSymptom = useCheckinStore((s) => s.toggleFlareSymptom);
  const timezone = getResolvedTimezone(useAuthStore((s) => s.profile?.timezone));
  const today = getLocalDateISO(timezone);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (selectionsLoading || eventsLoading || watchSymptomIds.length === 0) return;

    const loggedToday = events
      .filter((e) => e.logged_at.slice(0, 10) === today && watchSymptomIds.includes(e.symptom_id))
      .map((e) => e.symptom_id);

    const uniqueLogged = [...new Set(loggedToday)];
    initFlareFromPreLogged(uniqueLogged);
    initialized.current = true;
  }, [events, eventsLoading, watchSymptomIds, selectionsLoading, today, initFlareFromPreLogged]);

  if (selectionsLoading || watchSymptomIds.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-sand-100 pt-6">
      <h3 className="font-display text-lg text-sage-800">Anything flaring today?</h3>
      <div className="flex flex-wrap gap-2">
        {watchSymptomIds.map((id) => {
          const def = getSymptomByKey(id);
          if (!def) return null;
          const isSelected = flareSelected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleFlareSymptom(id)}
              className={[
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'border-sage-500 bg-sage-500 text-white'
                  : 'border-sage-200 bg-sage-50 text-sage-700 hover:border-sage-400 hover:bg-sage-100',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              {def.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
