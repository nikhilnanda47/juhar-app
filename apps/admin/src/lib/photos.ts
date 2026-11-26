// The rules for choosing photos to upload, checked in the browser BEFORE anything is sent, so a wrong pick is
// explained at once instead of after a long upload. The API checks all of this again (and the real content of the
// file, which a browser cannot): these are the same limits, in friendly words.
import { MEDIA } from '@juhar/shared';

export interface PickedFile {
  name: string;
  size: number;
  type: string;
}

const MB = MEDIA.MAX_FILE_BYTES / (1024 * 1024);
const isAccepted = (type: string) => (MEDIA.ACCEPTED_TYPES as readonly string[]).includes(type);

/**
 * Splits what was picked into the files to upload and a plain sentence for each one that cannot be. Files are taken
 * in the order picked, only as many as there is room for.
 */
export function checkPickedFiles<T extends PickedFile>(files: readonly T[], alreadyThere: number): { accepted: T[]; problems: string[] } {
  const accepted: T[] = [];
  const problems: string[] = [];
  let room = MEDIA.MAX_PER_PRODUCT - alreadyThere;

  for (const file of files) {
    if (!isAccepted(file.type)) {
      problems.push(`${file.name}: only JPG, PNG and WebP pictures can be used.`);
    } else if (file.size > MEDIA.MAX_FILE_BYTES) {
      problems.push(`${file.name}: this photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB; please choose one under ${MB} MB.`);
    } else if (file.size === 0) {
      problems.push(`${file.name}: this file is empty.`);
    } else if (room <= 0) {
      problems.push(`${file.name}: a saree can have at most ${MEDIA.MAX_PER_PRODUCT} photos, so this one was not added.`);
    } else {
      accepted.push(file);
      room -= 1;
    }
  }
  return { accepted, problems };
}

/** The ids in the order they would be in after moving the photo at `index` one place; null when it cannot move that way. */
export function movePhoto(ids: readonly string[], index: number, direction: -1 | 1): string[] | null {
  const target = index + direction;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** "3 of 10 photos" and what is left, for the heading of the Photos section */
export function photoCountText(count: number): string {
  const left = MEDIA.MAX_PER_PRODUCT - count;
  if (count === 0) return `No photos yet (up to ${MEDIA.MAX_PER_PRODUCT})`;
  return `${count} of ${MEDIA.MAX_PER_PRODUCT} photos${left === 0 ? ' (full)' : ''}`;
}
