import * as ImagePicker from 'expo-image-picker';

import { fail, ok, type Result } from '@/lib/errors';
import { supabase, storageBuckets } from '@/lib/supabase';

/**
 * Photo capture and upload.
 *
 * Every upload path is namespaced by user id because the storage RLS policies in
 * supabase/migrations/0002 scope writes to `<auth uid>/...`.
 */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize?: number | undefined;
  fileName?: string | undefined;
}

async function ensurePermission(message: string): Promise<Result<boolean>> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return fail(message, 'permission_denied');
  }
  return ok(true);
}

/**
 * Reads a local file URI into the base64 payload Supabase Storage expects.
 *
 * Shared by every upload path so the encoding step behaves identically for
 * listing photos, avatars and ID documents.
 */
export async function readAsBase64(uri: string): Promise<Result<string>> {
  const blob = await fetch(uri)
    .then((res) => res.blob())
    .catch(() => null);

  if (!blob) {
    return fail('That file could not be read. Try selecting it again.', 'read_failed');
  }

  const base64 = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onloadend = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? (result.split(',')[1] ?? null) : null);
    };
    reader.readAsDataURL(blob);
  });

  if (base64 === null) {
    return fail('That file could not be prepared for upload.', 'encode_failed');
  }

  return ok(base64);
}

export const imageService = {
  async pickFromLibrary(limit = 1): Promise<Result<PickedImage[]>> {
    const permission = await ensurePermission(
      'RoomLink needs access to your photos so you can add pictures. Enable it in your device settings.',
    );
    if (!permission.ok) return permission;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) return ok([]);

    const assets = result.assets.filter((asset) => {
      if (asset.mimeType && !ALLOWED_MIME.includes(asset.mimeType)) return false;
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) return false;
      return true;
    });

    if (assets.length === 0) {
      return fail('Choose a JPG, PNG or WebP image under 8 MB.', 'unsupported_asset');
    }

    return ok(
      assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileSize: asset.fileSize ?? undefined,
        fileName: asset.fileName ?? undefined,
      })),
    );
  },

  async takePhoto(): Promise<Result<PickedImage | null>> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return fail(
        'RoomLink needs camera access to photograph a property. Enable it in your device settings.',
        'permission_denied',
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled) return ok(null);

    const asset = result.assets[0];
    if (!asset) return ok(null);

    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      return fail('That photo is too large. Choose one under 8 MB.', 'too_large');
    }

    return ok({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize: asset.fileSize ?? undefined,
      fileName: asset.fileName ?? undefined,
    });
  },

  /**
   * Uploads one image and returns its storage object key.
   *
   * Returns a failure Result on any storage error; the caller must not record a
   * property_image row for a file that never uploaded.
   */
  async uploadPropertyImage(userId: string, image: PickedImage): Promise<Result<string>> {
    const encoded = await readAsBase64(image.uri);
    if (!encoded.ok) return encoded;

    const extension = (image.fileName?.split('.').pop() ?? 'jpg').toLowerCase();
    const objectPath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error } = await supabase.storage
      .from(storageBuckets.propertyImages)
      .upload(objectPath, encoded.data, { contentType: image.mimeType, upsert: false });

    if (error) {
      return fail(
        error.message === 'Requested entity too large'
          ? 'That photo is too large to upload. Choose one under 8 MB.'
          : 'The photo could not be uploaded. Check your connection and try again.',
        error.message ?? 'upload_failed',
      );
    }

    return ok(objectPath);
  },

  async uploadAvatar(userId: string, image: PickedImage): Promise<Result<string>> {
    const encoded = await readAsBase64(image.uri);
    if (!encoded.ok) return encoded;

    const objectPath = `${userId}/avatar-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(storageBuckets.avatars)
      .upload(objectPath, encoded.data, { contentType: 'image/jpeg', upsert: true });

    if (error) return fail('Your photo could not be uploaded. Try again.', 'upload_failed');
    return ok(objectPath);
  },

  /**
   * Resolves a stored key to a displayable URL.
   *
   * Uploaded files live in a public bucket, so the public URL is derived from the
   * project URL. Seeded demo rows store absolute URLs with no bucket prefix.
   */
  publicUrl(storagePath: string | null | undefined, isUploaded: boolean): string | null {
    if (!storagePath) return null;
    if (!isUploaded) return storagePath.startsWith('http') ? storagePath : null;
    if (storagePath.startsWith('http')) return storagePath;

    const base = supabase.storage.from(storageBuckets.propertyImages);
    const { data } = base.getPublicUrl(storagePath);
    return data.publicUrl ?? null;
  },
};