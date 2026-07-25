import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search, Star } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  SYMPTOM_CATALOG,
  getSymptomByKey,
  searchSymptomCatalog,
} from '../../data/symptoms';
import {
  SYMPTOM_BODY_SYSTEM_LABELS,
  type SymptomBodySystem,
  type SymptomDefinition,
} from '../../types/symptoms';
import { isMRSCanonicalKey } from '../../utils/checkinHelpers';

export type SymptomManageMode = 'tracked' | 'shortcuts';

interface SymptomManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: SymptomManageMode;
  trackedIds: string[];
  watchIds: string[];
  onSave: (trackedIds: string[], watchIds: string[]) => Promise<boolean>;
}

const MAX_SHORTCUTS = 5;

const BODY_SYSTEM_ORDER: SymptomBodySystem[] = [
  'vasomotor',
  'mood',
  'cognitive',
  'sleep',
  'musculoskeletal',
  'energy',
  'cardiovascular',
  'genitourinary',
  'digestive',
  'skin_hair_nails',
  'neurological',
  'other',
];

const PERSONAL_CATALOG = SYMPTOM_CATALOG.filter(
  (symptom) => !symptom.isMRSCore && !isMRSCanonicalKey(symptom.key),
);

function groupByBodySystem(symptoms: SymptomDefinition[]) {
  const groups = new Map<SymptomBodySystem, SymptomDefinition[]>();
  for (const system of BODY_SYSTEM_ORDER) groups.set(system, []);
  for (const symptom of symptoms) groups.get(symptom.bodySystem)?.push(symptom);
  return groups;
}

export function SymptomManageModal({
  isOpen,
  onClose,
  mode,
  trackedIds,
  watchIds,
  onSave,
}: SymptomManageModalProps) {
  const [localTracked, setLocalTracked] = useState<string[]>(trackedIds);
  const [localWatch, setLocalWatch] = useState<string[]>(watchIds);
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalTracked(trackedIds);
    setLocalWatch(watchIds.filter((id) => trackedIds.includes(id)));
    setQuery('');
    setSaveError(null);
  }, [isOpen, trackedIds, watchIds]);

  const availableSymptoms = useMemo(() => {
    const base =
      mode === 'shortcuts'
        ? localTracked
            .map((id) => getSymptomByKey(id))
            .filter((symptom): symptom is SymptomDefinition => Boolean(symptom))
        : PERSONAL_CATALOG;

    if (!query.trim()) return base;
    const allowed = new Set(base.map((symptom) => symptom.key));
    return searchSymptomCatalog(query, SYMPTOM_CATALOG.length).filter(
      (symptom) =>
        allowed.has(symptom.key) &&
        !symptom.isMRSCore &&
        !isMRSCanonicalKey(symptom.key),
    );
  }, [localTracked, mode, query]);

  const groups = useMemo(() => groupByBodySystem(availableSymptoms), [availableSymptoms]);

  const toggleTracked = (id: string) => {
    setLocalTracked((current) => {
      if (!current.includes(id)) return [...current, id];
      setLocalWatch((watch) => watch.filter((watchId) => watchId !== id));
      return current.filter((trackedId) => trackedId !== id);
    });
  };

  const toggleShortcut = (id: string) => {
    setLocalWatch((current) => {
      if (current.includes(id)) return current.filter((watchId) => watchId !== id);
      if (current.length >= MAX_SHORTCUTS) return current;
      return [...current, id];
    });
  };

  const handleSave = async () => {
    const sanitizedWatch = localWatch.filter((id) => localTracked.includes(id));
    setIsSaving(true);
    setSaveError(null);
    const ok = await onSave(localTracked, sanitizedWatch);
    setIsSaving(false);
    if (ok) {
      onClose();
    } else {
      setSaveError('Your symptom choices could not be saved. Please try again.');
    }
  };

  const title = mode === 'tracked' ? 'Edit personal symptoms' : 'Edit Quick Log shortcuts';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {mode === 'tracked' ? (
        <div className="mb-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
          <h3 className="font-medium text-sage-800">Personal symptoms and Quick Log</h3>
          <p className="mt-1 text-sm leading-relaxed text-sage-600">
            Your weekly MRS questions are fixed and always included. Personal symptoms come from
            TrackHer&apos;s full symptom library and help you follow concerns beyond the MRS.
            Quick Log shortcuts are managed separately. Removing a personal symptom stops future
            weekly prompts without deleting its history.
          </p>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-sm leading-relaxed text-sage-600">
            Star up to five tracked symptoms for one-tap Quick Log buttons. Removing a star does
            not remove weekly tracking or delete history.
          </p>
          <p className="mt-2 text-sm font-medium text-sage-700">
            {localWatch.length} of {MAX_SHORTCUTS} starred
          </p>
        </div>
      )}

      <label className="relative block">
        <span className="sr-only">Search symptoms</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sage-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            mode === 'tracked' ? 'Search the full symptom library…' : 'Search tracked symptoms…'
          }
          className="w-full rounded-lg border border-sand-200 bg-sand-50 py-2.5 pl-9 pr-3 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
        />
      </label>

      <div className="mt-4 max-h-[50dvh] space-y-5 overflow-y-auto pr-1">
        {availableSymptoms.length === 0 ? (
          <p className="rounded-lg border border-sand-200 px-4 py-6 text-center text-sm text-sage-500">
            {mode === 'shortcuts' && localTracked.length === 0
              ? 'No personal symptoms are tracked yet. Add them from the Check In page first.'
              : 'No matching symptoms. Try a different everyday or clinical term.'}
          </p>
        ) : (
          BODY_SYSTEM_ORDER.map((system) => {
            const symptoms = groups.get(system) ?? [];
            if (symptoms.length === 0) return null;
            return (
              <section key={system}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sage-500">
                  {SYMPTOM_BODY_SYSTEM_LABELS[system]}
                </h3>
                <div className="space-y-2">
                  {symptoms.map((symptom) => {
                    const tracked = localTracked.includes(symptom.key);
                    const starred = localWatch.includes(symptom.key);
                    const shortcutLimitReached =
                      mode === 'shortcuts' && !starred && localWatch.length >= MAX_SHORTCUTS;

                    return (
                      <button
                        key={symptom.key}
                        type="button"
                        onClick={() =>
                          mode === 'tracked'
                            ? toggleTracked(symptom.key)
                            : toggleShortcut(symptom.key)
                        }
                        disabled={shortcutLimitReached}
                        aria-pressed={mode === 'tracked' ? tracked : starred}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                          mode === 'tracked'
                            ? tracked
                              ? 'border-sage-400 bg-sage-50'
                              : 'border-sand-200 hover:border-sage-300 hover:bg-sage-50/50'
                            : starred
                              ? 'border-sage-400 bg-sage-50'
                              : 'border-sand-200 hover:border-sage-300 hover:bg-sage-50/50',
                          shortcutLimitReached ? 'cursor-not-allowed opacity-45' : '',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            mode === 'tracked'
                              ? tracked
                                ? 'bg-sage-500 text-on-accent'
                                : 'bg-sand-100 text-sage-400'
                              : starred
                                ? 'bg-sage-500 text-on-accent'
                                : 'bg-sand-100 text-sage-400',
                          ].join(' ')}
                          aria-hidden
                        >
                          {mode === 'tracked' ? (
                            tracked ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )
                          ) : (
                            <Star className={['h-4 w-4', starred ? 'fill-current' : ''].join(' ')} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-sage-800">{symptom.label}</span>
                          {symptom.description && (
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-sage-500">
                              {symptom.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {saveError && <p className="mt-4 text-sm text-danger">{saveError}</p>}

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          isLoading={isSaving}
          loadingText="Saving…"
          onClick={() => void handleSave()}
          className="flex-1"
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}
