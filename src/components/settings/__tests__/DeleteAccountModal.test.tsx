import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountModal } from '../DeleteAccountModal';

describe('DeleteAccountModal', () => {
  it('keeps the typed-DELETE confirm step open after advancing from the warning', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountModal
        isOpen
        onClose={() => {}}
        onDelete={async () => ({ success: true })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Delete your account?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));

    // Regression for the deps-[isOpen, step] bug: advancing to confirm must not snap back
    // to the warning. The confirm dialog is the only place "Type DELETE" appears.
    expect(screen.getByRole('heading', { name: 'Final confirmation' })).toBeInTheDocument();
    expect(screen.getByText(/Type/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type DELETE')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delete your account?' })).not.toBeInTheDocument();
  });

  it('enables permanent delete only after DELETE is typed', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => ({ success: true }));
    render(<DeleteAccountModal isOpen onClose={() => {}} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }));
    const confirm = screen.getByRole('button', { name: 'Permanently delete my account' });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Type DELETE'), 'DELETE');
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(await screen.findByRole('heading', { name: 'Account deleted' })).toBeInTheDocument();
  });
});
