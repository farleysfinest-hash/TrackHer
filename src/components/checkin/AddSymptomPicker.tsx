import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { searchSymptomCatalog, getSymptomByKey } from '../../data/symptoms';
import type { SymptomDefinition } from '../../types/symptoms';
import { SYMPTOM_BODY_SYSTEM_LABELS } from '../../types/symptoms';
import { isMRSCanonicalKey } from '../../utils/checkinHelpers';
import { Modal } from '../ui/Modal';

interface AddSymptomPickerProps {
  isOpen: boolean;
  onClose: () => void;
  excludeIds: string[];
  onSelect: (symptomId: string) => void;
}

type PickerRow =
  | { kind: 'select'; def: SymptomDefinition }
  | { kind: 'core'; def: SymptomDefinition };

export function AddSymptomPicker({ isOpen, onClose, excludeIds, onSelect }: AddSymptomPickerProps) {
  const [query, setQuery] = useState('');

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const results = useMemo<PickerRow[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const exclude = new Set(excludeIds);
    return searchSymptomCatalog(q, 30)
      .map<PickerRow>((s) =>
        s.isMRSCore || isMRSCanonicalKey(s.key)
          ? { kind: 'core', def: s }
          : { kind: 'select', def: s },
      )
      .filter((row) => row.kind === 'core' || !exclude.has(row.def.key))
      .slice(0, 8);
  }, [query, excludeIds]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add a symptom" size="md">
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symptoms…"
          autoFocus
          className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm text-sage-800 placeholder:text-sage-400 focus:border-sage-400 focus:outline-none focus:ring-1 focus:ring-sage-400"
        />
        <div className="max-h-64 overflow-y-auto rounded-lg border border-sand-200">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-sage-400">
              {query.trim()
                ? 'No matching symptoms — try a different word.'
                : 'Type to search the full catalog.'}
            </p>
          ) : (
            <ul>
              {results.map((row) =>
                row.kind === 'select' ? (
                  <li key={row.def.key}>
                    <button
                      type="button"
                      onClick={() => handleSelect(row.def.key)}
                      className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-sand-50"
                    >
                      <span className="font-medium text-sage-800">{row.def.label}</span>
                      <span className="text-xs text-sage-400">
                        {SYMPTOM_BODY_SYSTEM_LABELS[row.def.bodySystem]}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={row.def.key}>
                    <div
                      aria-disabled="true"
                      className="flex w-full cursor-default flex-col items-start px-3 py-2.5 text-sm"
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="font-medium text-sage-500">{row.def.label}</span>
                        <span className="whitespace-nowrap rounded-full bg-sand-100 px-2 py-0.5 text-xs text-sage-500">
                          In your check-in
                        </span>
                      </div>
                      <span className="text-xs text-sage-400">
                        {SYMPTOM_BODY_SYSTEM_LABELS[row.def.bodySystem]}
                      </span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function KeepWatchingPrompt({
  symptomId,
  onKeep,
  onDismiss,
}: {
  symptomId: string;
  onKeep: () => void;
  onDismiss: () => void;
}) {
  const def = getSymptomByKey(symptomId);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm">
      <span className="text-sage-700">
        Keep watching <strong>{def?.label ?? symptomId}</strong>?
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onKeep}
          className="rounded-full bg-sage-600 px-3 py-1 text-xs font-medium text-white hover:bg-sage-700"
        >
          Yes, add to watch list
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-3 py-1 text-xs text-sage-500 hover:text-sage-700"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
