import { Directory, File, Paths } from 'expo-file-system';

import { createId } from '@/db/client';

/**
 * Photos picked from the camera or library land in a cache/temporary location
 * that the OS may purge. To keep interest-point photos across relaunches we copy
 * them into a dedicated subfolder of the persistent document directory and store
 * *that* uri in the database. `deletePhotos`/`clearAllPhotos` remove the on-disk
 * copies when a point (or all data) is deleted.
 */
const PHOTO_DIR = 'interest-photos';

/** The photo directory, created on first use (idempotent). */
function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copies a picked/captured image into the persistent photo directory and
 * returns the new file uri. The source may be a cache uri that is later evicted;
 * the returned uri is stable.
 */
export async function persistPhoto(sourceUri: string): Promise<string> {
  const dir = photoDirectory();
  const source = new File(sourceUri);
  const ext = source.extension || '.jpg';
  const target = new File(dir, `${createId()}${ext}`);
  await source.copy(target);
  return target.uri;
}

/** Best-effort delete of persisted photo files; missing files are ignored. */
export function deletePhotos(uris: string[]): void {
  for (const uri of uris) {
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Ignore: a photo the user removed before saving, or an already-gone file.
    }
  }
}

/** Removes the entire photo directory. Used by the clear-all-data reset. */
export function clearAllPhotos(): void {
  try {
    const dir = new Directory(Paths.document, PHOTO_DIR);
    if (dir.exists) dir.delete();
  } catch {
    // Ignore: nothing to clear.
  }
}
