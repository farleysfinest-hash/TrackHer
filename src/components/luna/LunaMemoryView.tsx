import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Trash2 } from 'lucide-react';
import type { LunaMemory } from '../../types/database';
import {
  clearLunaMemories,
  deleteLunaMemory,
  lunaPersistenceError,
  MemorySafetyError,
  updateLunaMemory,
} from '../../lib/lunaConversations';
import { useConfirmFocusScope } from '../../hooks/useConfirmFocusScope';
import { Button } from '../ui/Button';

type MemoryConfirm = { kind: 'clear' } | { kind: 'delete'; memoryId: string };

interface LunaMemoryViewProps {
  userId: string | undefined;
  memories: LunaMemory[];
  storageError: string | null;
  setMemories: Dispatch<SetStateAction<LunaMemory[]>>;
  onError: (message: string) => void;
}

export function LunaMemoryView({
  userId,
  memories,
  storageError,
  setMemories,
  onError,
}: LunaMemoryViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [confirm, setConfirm] = useState<MemoryConfirm | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useConfirmFocusScope(Boolean(confirm), confirmRef, () => setConfirm(null));

  const reportError = (error: unknown) => {
    onError(error instanceof MemorySafetyError ? error.message : lunaPersistenceError(error));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <p className="text-sm leading-relaxed text-sage-600">
        I use only memories you explicitly saved or confirmed. You can change or remove any of
        them.
      </p>
      {storageError && <p className="mb-3 mt-3 text-sm text-sage-600">{storageError}</p>}
      <div className="mt-4 space-y-3">
        {memories.length === 0 && (
          <p className="rounded-xl border border-sand-200 p-4 text-sm text-sage-500">
            I am not remembering any personal context yet.
          </p>
        )}
        {memories.map((memory) => (
          <div key={memory.id} className="rounded-xl border border-sand-200 p-3">
            {editingId === memory.id ? (
              <div className="space-y-2">
                <textarea
                  value={editingText}
                  maxLength={1000}
                  onChange={(event) => setEditingText(event.target.value.slice(0, 1000))}
                  className="w-full rounded-lg border border-sand-200 bg-sand-50 p-3 text-base text-sage-800"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!userId || !editingText.trim()) return;
                      const nextContent = editingText.trim().slice(0, 1000);
                      void updateLunaMemory(userId, memory.id, nextContent)
                        .then(() => {
                          setMemories((current) =>
                            current.map((item) =>
                              item.id === memory.id
                                ? { ...item, content: nextContent }
                                : item,
                            ),
                          );
                          setEditingId(null);
                        })
                        .catch((error: unknown) => {
                          reportError(error);
                        });
                    }}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-sage-700">
                    {memory.content}
                  </p>
                  <button
                    type="button"
                    className="text-xs text-sage-500 underline"
                    onClick={() => {
                      setEditingId(memory.id);
                      setEditingText(memory.content);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-sage-400 hover:text-sage-600"
                    aria-label="Delete memory"
                    onClick={() => setConfirm({ kind: 'delete', memoryId: memory.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {confirm?.kind === 'delete' && confirm.memoryId === memory.id && (
                  <div
                    ref={confirmRef}
                    className="mt-3 rounded-xl border border-sand-300 bg-sand-100 p-3"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby={`delete-luna-memory-${memory.id}`}
                  >
                    <p
                      id={`delete-luna-memory-${memory.id}`}
                      className="text-sm font-medium text-sage-800"
                    >
                      Forget this memory?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          if (!userId) return;
                          void deleteLunaMemory(userId, memory.id)
                            .then(() =>
                              setMemories((current) =>
                                current.filter((item) => item.id !== memory.id),
                              ),
                            )
                            .catch(reportError)
                            .finally(() => setConfirm(null));
                        }}
                      >
                        Yes, forget it
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-cancel
                        onClick={() => setConfirm(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {memories.length > 0 && confirm?.kind !== 'clear' && (
        <Button
          variant="danger"
          size="sm"
          className="mt-5"
          onClick={() => setConfirm({ kind: 'clear' })}
        >
          Clear all memories
        </Button>
      )}
      {memories.length > 0 && confirm?.kind === 'clear' && (
        <div
          ref={confirmRef}
          className="mt-5 rounded-xl border border-sand-300 bg-sand-100 p-3"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-luna-memories-title"
        >
          <p id="clear-luna-memories-title" className="text-sm font-medium text-sage-800">
            Clear all {memories.length} {memories.length === 1 ? 'memory' : 'memories'}?
          </p>
          <p className="mt-1 text-xs text-sage-600">
            This does not delete your saved conversations.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (!userId) return;
                void clearLunaMemories(userId)
                  .then(() => setMemories([]))
                  .catch(reportError)
                  .finally(() => setConfirm(null));
              }}
            >
              Yes, clear all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-cancel
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
