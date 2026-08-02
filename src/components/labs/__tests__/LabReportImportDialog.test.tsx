import { fireEvent, render, screen } from '@testing-library/react';
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

  it('rejects a report image over 8 MB before calling Luna', () => {
    const { container } = render(
      <LabReportImportDialog
        isOpen
        medicationNames={[]}
        onClose={vi.fn()}
        onImported={vi.fn()}
      />,
    );
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toHaveAttribute('capture');
    const file = new File(['report'], 'report.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 8 * 1024 * 1024 + 1 });

    fireEvent.change(input!, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'That image is larger than 8 MB. Crop it to the report page and try again.',
    );
  });
});
