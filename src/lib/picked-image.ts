import { Platform } from 'react-native';

import type { ImagePickerAsset } from 'expo-image-picker';

/** Longest edge of a stored picture — plenty for a phone-sized preview. */
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Turns a picture from the picker into a URI local storage can keep.
 *
 * Native hands back a `file://` path, which already survives a restart as-is.
 * The web picker hands back a `blob:` URL, and blob URLs die the moment the
 * page reloads — the photo would vanish on refresh, so those are re-encoded
 * through a canvas into a compact data URL. Downscaling on the way in also
 * keeps AsyncStorage from hitting its quota: an untrimmed photo can be several
 * megabytes once base64-encoded, three of those and the room would fail to
 * save at all.
 */
export async function normalisePickedImage(asset: ImagePickerAsset): Promise<string> {
  if (Platform.OS !== 'web') return asset.uri;
  if (asset.uri.startsWith('data:')) return asset.uri;

  try {
    const image = await loadImage(asset.uri);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');

    // Paint white first so transparent images do not come out on black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    // Anything canvas refuses (odd formats, broken decodes) is stored exactly
    // as the browser read it, so the picture is never silently dropped.
    return readAsDataUrl(asset.uri);
  }
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to decode'));
    image.src = uri;
  });
}

function readAsDataUrl(uri: string): Promise<string> {
  return fetch(uri)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Could not read the file'));
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') resolve(result);
            else reject(new Error('Could not read the file'));
          };
          reader.readAsDataURL(blob);
        }),
    );
}
