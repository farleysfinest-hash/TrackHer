import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LunaCaptureReview } from '../LunaCaptureReview';

const mocks = vi.hoisted(() => ({
  extract: vi.fn(async () => null),
  clear: vi.fn(),
  fetchActiveMedications: vi.fn(async () => undefined),
}));

vi.mock('../../../hooks/useJournalExtract', () => ({
  useJournalExtract: () => ({
    extract: mocks.extract,
    clear: mocks.clear,
    isLoading: false,
    error: null,
    result: {
      symptoms: [{ key: 'anxiety', label: 'Anxiety', reason: 'should stay hidden' }],
      events: [{ type: 'note', medicationName: null, note: 'should stay hidden' }],
      followUpQuestions: [],
      risk: 'crisis',
      riskReply: 'I am taking this seriously. Use the support actions above.',
    },
  }),
}));

vi.mock('../../../hooks/useQuickLog', () => ({
  useQuickLog: () => ({ createEvent: vi.fn() }),
}));

vi.mock('../../../hooks/useMedications', () => ({
  useMedications: () => ({
    medications: [],
    updateMedication: vi.fn(),
    fetchActiveMedications: mocks.fetchActiveMedications,
  }),
}));

vi.mock('../../../stores/toastStore', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { profile: { timezone: string } }) => unknown) =>
    selector({ profile: { timezone: 'UTC' } }),
}));

vi.mock('../../../lib/haptics', () => ({ tapLight: vi.fn() }));

describe('LunaCaptureReview crisis rendering', () => {
  it('shows the risk reply and support links without capture controls', async () => {
    const user = userEvent.setup();
    render(<LunaCaptureReview text="source text" />);

    await user.click(screen.getByRole('button', { name: 'Review what Luna could add' }));

    expect(
      screen.getByText('I am taking this seriously. Use the support actions above.'),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: '988' })).toHaveAttribute('href', 'tel:988');
    expect(screen.getByRole('link', { name: 'findahelpline.com' })).toHaveAttribute(
      'href',
      'https://findahelpline.com',
    );
    expect(screen.queryByText('Possible symptoms')).not.toBeInTheDocument();
    expect(screen.queryByText('Possible medication notes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anxiety' })).not.toBeInTheDocument();
  });
});
