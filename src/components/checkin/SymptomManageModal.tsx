import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Search } from 'lucide-react';
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
import { useSymptomAiSuggestions } from '../../hooks/useSymptomAiSuggestions';

interface SymptomManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackedIds: string[];
  /** Kept for call-site back-compat; ignored — tracked = Quick Log. */
  watchIds?: string[];
  onSave: (trackedIds: string[], watchIds: string[]) => Promise<boolean>;
}

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

function groupByBodySystem(symptoms: SymptomDefinition[]) {
  const groups = new Map<SymptomBodySystem, SymptomDefinition[]>();
  for (const system of BODY_SYSTEM_ORDER) groups.set(system, []);
  for (const symptom of symptoms) groups.get(symptom.bodySystem)?.push(symptom);
  return groups;
}

export function SymptomManageModal({
  isOpen,
  onClose,
  trackedIds,
  onSave,
}: SymptomManageModalProps) {
  const [localTracked, setLocalTracked] = useState<string[]>(trackedIds);
  const [query, setQuery] = useState('');
  const [browseLibrary, setBrowseLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalTracked(trackedIds);
    setQuery('');
    setBrowseLibrary(false);
    setSaveError(null);
  }, [isOpen, trackedIds]);

  const trackedSymptoms = useMemo(
    () =>
      localTracked
        .map((id) => getSymptomByKey(id))
        .filter((symptom): symptom is SymptomDefinition => Boolean(symptom)),
    [localTracked],
  );

  const searching = query.trim().length > 0;
  const showingLibrary = browseLibrary || searching;

  const availableSymptoms = useMemo(() => {
    const base = showingLibrary ? SYMPTOM_CATALOG : trackedSymptoms;
    if (!searching) return base;

    const allowed = new Set(base.map((symptom) => symptom.key));
    return searchSymptomCatalog(query, SYMPTOM_CATALOG.length).filter((symptom) =>
      allowed.has(symptom.key),
    );
  }, [query, searching, showingLibrary, trackedSymptoms]);

  const { suggestions: aiSuggestions, isLoading: aiSuggestLoading } = useSymptomAiSuggestions(
    query,
    availableSymptoms.length,
    isOpen && searching,
  );

  const groups = useMemo(() => groupByBodySystem(availableSymptoms), [availableSymptoms]);

  const toggleTracked = (id: string) => {
    setLocalTracked((current) => {
      if (!current.includes(id)) return [...current, id];
      return current.filter((trackedId) => trackedId !== id);
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    // Watch mirrors tracked — every tracked symptom is a Quick Log chip.
    const ok = await onSave(localTracked, localTracked);
    setIsSaving(false);
    if (ok) {
      onClose();
    } else {
      setSaveError('Your symptom choices could not be saved. Please try again.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit personal symptoms" size="lg">
      <div className="mb-5 rounded-xl border border-sage-200 bg-sage-50 p-4">
        <h3 className="font-medium text-sage-800">Symptoms for Quick Log</h3>
        <p className="mt-1 text-sm leading-relaxed text-sage-600">
          Everything you track here appears as a one-tap chip on Quick Log — including MRS
          items like irritability if you want them daily. Weekly Check-In still asks the full
          MRS scale on its own. Removing a symptom stops future prompts without deleting its
          history.
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm font-medium text-sage-700">
            {localTracked.length} tracked
          </p>
          {localTracked.length > 3 && (
            <button
              type="button"
              onClick={() => setLocalTracked([])}
              className="text-xs text-sage-500 underline hover:text-sage-700"
            >
              Remove all
            </button>
          )}
        </div>
      </div>

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
          placeholder="Search the full symptom library…"
          className="w-full rounded-lg border border-sand-200 bg-sand-50 py-2.5 pl-9 pr-3 text-base text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
        />
      </label>

      {!searching && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-sage-500">
            {showingLibrary
              ? 'Browsing the full symptom library'
              : localTracked.length > 0
                ? 'Your tracked symptoms'
                : 'You have no tracked symptoms yet'}
          </p>
          <button
            type="button"
            onClick={() => setBrowseLibrary((current) => !current)}
            className="shrink-0 text-sm font-medium text-sage-600 underline hover:text-sage-700"
          >
            {showingLibrary ? 'Show mine only' : 'Add from library'}
          </button>
        </div>
      )}

      <div className="mt-4 max-h-[50dvh] space-y-5 overflow-y-auto pr-1">
        {availableSymptoms.length === 0 ? (
          <div className="rounded-lg border border-sand-200 px-4 py-6 text-center text-sm text-sage-500">
            <p>
              {searching
                ? 'No matching symptoms. Try a different everyday or clinical term.'
                : 'No symptoms yet. Choose “Add from library” to pick the concerns you want to follow.'}
            </p>
            {searching && aiSuggestLoading && (
              <p className="mt-2 text-xs text-sage-400">Asking Luna…</p>
            )}
            {searching && aiSuggestions.length > 0 && (
              <ul className="mt-3 space-y-1 text-left">
                {aiSuggestions.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => toggleTracked(s.key)}
                      className="w-full rounded-lg border border-sand-200 px-3 py-2 text-left text-sm text-sage-700 hover:bg-sage-50"
                    >
                      <span className="font-medium">{s.label}</span>
                      {s.reason ? (
                        <span className="mt-0.5 block text-xs text-sage-400">{s.reason}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
                    const isMrs = symptom.isMRSCore || isMRSCanonicalKey(symptom.key);

                    return (
                      <div
                        key={symptom.key}
                        role="group"
                        aria-label={symptom.label}
                        className={[
                          'flex w-full items-center rounded-xl border text-left transition-colors',
                          tracked
                            ? 'border-sage-400 bg-sage-50'
                            : 'border-sand-200 hover:border-sage-300 hover:bg-sage-50/50',
                        ].join(' ')}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTracked(symptom.key)}
                          aria-pressed={tracked}
                          aria-label={
                            tracked
                              ? `Stop tracking ${symptom.label}`
                              : `Track ${symptom.label}`
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left"
                        >
                          <span
                            className={[
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                              tracked ? 'bg-sage-500 text-on-accent' : 'bg-sand-100 text-sage-400',
                            ].join(' ')}
                            aria-hidden
                          >
                            {tracked ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="font-medium text-sage-800">{symptom.label}</span>
                              {isMrs && (
                                <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-xs text-sage-500">
                                  MRS
                                </span>
                              )}
                            </span>
                            {symptom.description && (
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-sage-500">
                                {symptom.description}
                              </span>
                            )}
                          </span>
                        </button>
                        {tracked && !showingLibrary && (
                          <button
                            type="button"
                            onClick={() => toggleTracked(symptom.key)}
                            className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sage-400 hover:bg-sage-100 hover:text-sage-600"
                            aria-label={`Remove ${symptom.label}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
