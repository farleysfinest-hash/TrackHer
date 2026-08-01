import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LabReportImportDialog } from '../LabReportImportDialog';

describe('LabReportImportDialog', () => {
  it('keeps the primary action active and explains what information Luna needs', async () => {
    const user = userEvent.setup();
    render(
      <LabReportImportDialog
        isOpen
        medicationNames={[]}
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Take a clear photo or choose an image. I’ll prepare a draft, then you’ll check every value before anything is saved.'),
    ).toBeVisible();
    const chooseButton = screen.getByRole('button', { name: 'Choose a report photo' });
    expect(chooseButton).toBeEnabled();
    await user.click(chooseButton);
  });
});
