import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LunaMemory } from '../../../types/database';
import { LunaMemoryView } from '../LunaMemoryView';
import { deleteLunaMemory } from '../../../lib/lunaConversations';

vi.mock('../../../lib/lunaConversations', () => {
  class MemorySafetyError extends Error {}
  return {
    MemorySafetyError,
    clearLunaMemories: vi.fn(async () => undefined),
    deleteLunaMemory: vi.fn(async () => undefined),
    updateLunaMemory: vi.fn(async () => undefined),
    lunaPersistenceError: () => 'Storage unavailable',
  };
});

const memoryFixture: LunaMemory = {
  id: 'memory-1',
  user_id: 'user-1',
  content: 'Prefers evening check-ins',
  source_thread_id: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

function Harness() {
  const [memories, setMemories] = useState<LunaMemory[]>([memoryFixture]);
  return (
    <LunaMemoryView
      userId="user-1"
      memories={memories}
      storageError={null}
      setMemories={setMemories}
      onError={() => undefined}
    />
  );
}

describe('LunaMemoryView delete confirmation', () => {
  beforeEach(() => {
    vi.mocked(deleteLunaMemory).mockClear();
  });

  it('does not delete until the confirm is accepted', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Delete memory' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Forget this memory?' });
    expect(confirm).toBeVisible();
    expect(vi.mocked(deleteLunaMemory)).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Yes, forget it' }));
    await waitFor(() =>
      expect(vi.mocked(deleteLunaMemory)).toHaveBeenCalledWith('user-1', 'memory-1'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Prefers evening check-ins')).not.toBeInTheDocument(),
    );
  });

  it('dismisses the confirm on Escape without deleting and restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Delete memory' });
    await user.click(trigger);
    expect(screen.getByRole('alertdialog', { name: 'Forget this memory?' })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(vi.mocked(deleteLunaMemory)).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab cycling inside the open confirm', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Delete memory' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    // Cancel is the last focusable in the confirm: Tab must wrap to the first.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Yes, forget it' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
