import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types/database';
import { getProfileAvatar, withProfileAvatar } from '../profileAvatar';

function profileWithUiState(ui_state: Record<string, unknown>): Profile {
  return { ui_state } as Profile;
}

describe('profile avatar state', () => {
  it('reads only embedded image values', () => {
    expect(
      getProfileAvatar(
        profileWithUiState({ profile_avatar_data_url: 'data:image/jpeg;base64,abc' }),
      ),
    ).toBe('data:image/jpeg;base64,abc');
    expect(getProfileAvatar(profileWithUiState({ profile_avatar_data_url: 'https://example.com' }))).toBeNull();
  });

  it('adds and removes the avatar without dropping unrelated UI state', () => {
    const withAvatar = withProfileAvatar({ welcome_seen: true }, 'data:image/jpeg;base64,abc');
    expect(withAvatar).toEqual({
      welcome_seen: true,
      profile_avatar_data_url: 'data:image/jpeg;base64,abc',
    });

    expect(withProfileAvatar(withAvatar, null)).toEqual({ welcome_seen: true });
  });
});
