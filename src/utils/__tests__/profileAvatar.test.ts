import { describe, expect, it } from 'vitest';
import type { Profile } from '../../types/database';
import { AVATAR_STAMP_KEY, avatarObjectPath, getProfileAvatarStamp } from '../profileAvatar';

function profileWithUiState(ui_state: Record<string, unknown>): Profile {
  return { ui_state } as Profile;
}

describe('profile avatar storage state', () => {
  it('scopes the object to a per-user folder so the bucket policy can match on it', () => {
    // Migration 027 keys every avatars policy off (storage.foldername(name))[1].
    const userId = '1f1c4c1e-0000-4000-8000-abcdefabcdef';
    expect(avatarObjectPath(userId)).toBe(`${userId}/avatar.jpg`);
    expect(avatarObjectPath(userId).split('/')[0]).toBe(userId);
  });

  it('reads the stamp only when it is a non-empty string', () => {
    expect(
      getProfileAvatarStamp(profileWithUiState({ [AVATAR_STAMP_KEY]: '2026-07-24T00:00:00.000Z' })),
    ).toBe('2026-07-24T00:00:00.000Z');

    expect(getProfileAvatarStamp(profileWithUiState({ [AVATAR_STAMP_KEY]: '' }))).toBeNull();
    expect(getProfileAvatarStamp(profileWithUiState({ [AVATAR_STAMP_KEY]: null }))).toBeNull();
    expect(getProfileAvatarStamp(profileWithUiState({ welcome_seen: true }))).toBeNull();
    expect(getProfileAvatarStamp(null)).toBeNull();
  });

  it('treats a cleared stamp as no picture, so removal skips the signed-URL call', () => {
    // handleAvatarRemove writes null through merge_ui_state; the key survives
    // with a JSON null rather than disappearing.
    expect(getProfileAvatarStamp(profileWithUiState({ [AVATAR_STAMP_KEY]: null }))).toBeNull();
  });
});
