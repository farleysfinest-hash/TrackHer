import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

/**
 * Profile pictures live in the private `avatars` Storage bucket, one folder per
 * user (see migration 027). ui_state holds only a timestamp, so the image does
 * not ride along on every profile fetch — and so the app knows whether to ask
 * for a signed URL at all.
 *
 * This module deliberately imports nothing but the Supabase client: authStore
 * calls into it for account cleanup, and reaching for lib/uiState here would
 * close an import cycle (uiState -> authStore -> profileAvatar -> uiState).
 * Callers persist the stamp themselves via setUiValue.
 */

export const AVATAR_BUCKET = 'avatars';
export const AVATAR_STAMP_KEY = 'profile_avatar_updated_at';

const AVATAR_SIZE_PX = 256;
const AVATAR_QUALITY = 0.84;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function avatarObjectPath(userId: string): string {
  return `${userId}/avatar.jpg`;
}

/** Null when the user has no picture, so the caller can skip the signed-URL round trip. */
export function getProfileAvatarStamp(profile: Profile | null | undefined): string | null {
  const value = profile?.ui_state?.[AVATAR_STAMP_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function getProfileAvatarUrl(userId: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(avatarObjectPath(userId), SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('This image format could not be opened.'));
    };
    image.src = objectUrl;
  });
}

/** Center-crops to a square and re-encodes as a small JPEG before upload. */
export async function prepareProfileAvatarBlob(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 12 MB.');
  }

  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  if (sourceSize <= 0) {
    throw new Error('This image has no readable dimensions.');
  }

  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This device could not prepare the image.');
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_SIZE_PX,
    AVATAR_SIZE_PX,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', AVATAR_QUALITY);
  });

  if (!blob) {
    throw new Error('This device could not prepare the image.');
  }
  return blob;
}

/** Uploads (or replaces) the picture. Returns the stamp the caller should persist. */
export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const blob = await prepareProfileAvatarBlob(file);

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarObjectPath(userId), blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
  return new Date().toISOString();
}

/**
 * Best-effort removal of the stored object. Used by the Settings remove button
 * and by account reset/deletion, where a storage failure must not block the
 * database work that follows.
 */
export async function removeProfileAvatarObject(userId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([avatarObjectPath(userId)]);

  return { error: error ? error.message : null };
}
