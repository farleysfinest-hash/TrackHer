import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { LunaThread } from '../../types/database';
import { useConfirmFocusScope } from '../../hooks/useConfirmFocusScope';
import { Button } from '../ui/Button';

interface LunaHistoryViewProps {
  threads: LunaThread[];
  storageError: string | null;
  onOpen: (thread: LunaThread) => void;
  onDelete: (thread: LunaThread) => void;
}

export function LunaHistoryView({
  threads,
  storageError,
  onOpen,
  onDelete,
}: LunaHistoryViewProps) {
  const [confirmThread, setConfirmThread] = useState<LunaThread | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useConfirmFocusScope(Boolean(confirmThread), confirmRef, () => setConfirmThread(null));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <p className="mb-4 text-sm text-sage-500">
        Conversations stay separate. Reopening one restores only that conversation.
      </p>
      {storageError && <p className="mb-3 text-sm text-sage-600">{storageError}</p>}
      <div className="space-y-3">
        {threads.length === 0 && (
          <p className="rounded-xl border border-sand-200 p-4 text-sm text-sage-500">
            No saved conversations yet.
          </p>
        )}
        {threads.map((thread) => (
          <div
            key={thread.id}
            className="flex items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3"
          >
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(thread)}>
              <p className="truncate text-sm font-medium text-sage-800">{thread.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-sage-500">
                {thread.last_message_preview || 'No messages yet'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setConfirmThread(thread)}
              className="rounded-lg p-2 text-sage-400 hover:bg-sage-50 hover:text-sage-600"
              aria-label={`Delete ${thread.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {confirmThread && (
        <div
          ref={confirmRef}
          className="mt-5 rounded-xl border border-sand-300 bg-sand-100 p-3"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-luna-thread-title"
        >
          <p id="delete-luna-thread-title" className="text-sm font-medium text-sage-800">
            Delete “{confirmThread.title}”?
          </p>
          <p className="mt-1 text-xs text-sage-600">
            This permanently removes the conversation and its messages.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const target = confirmThread;
                setConfirmThread(null);
                onDelete(target);
              }}
            >
              Yes, delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-cancel
              onClick={() => setConfirmThread(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
