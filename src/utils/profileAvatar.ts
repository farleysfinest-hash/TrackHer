import type { Profile } from '../types/database';

const AVATAR_UI_STATE_KEY = 'profile_avatar_data_url';
const AVATAR_SIZE_PX = 256;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export function getProfileAvatar(profile: Profile | null | undefined): string | null {
  const value = profile?.ui_state?.[AVATAR_UI_STATE_KEY];
  return typeof value === 'string' && value.startsWith('data:image/') ? value : null;
}

export function withProfileAvatar(
  uiState: Record<string, unknown> | null | undefined,
  avatarDataUrl: string | null,
): Record<string, unknown> {
  const next = { ...(uiState ?? {}) };
  if (avatarDataUrl) {
    next[AVATAR_UI_STATE_KEY] = avatarDataUrl;
  } else {
    delete next[AVATAR_UI_STATE_KEY];
  }
  return next;
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

export async function prepareProfileAvatar(file: File): Promise<string> {
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

  return canvas.toDataURL('image/jpeg', 0.84);
}
