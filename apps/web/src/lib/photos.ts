// Which photo to show for a colour. The same rule the API uses for the bag, wishlist and orders
// (apps/api/src/modules/media/media.service.ts, thumbnailsForVariants), so a page and the bag agree.

export interface PhotoLike {
  url: string;
  thumbnailUrl?: string | null;
  variantId?: string | null;
}

/** The photo that shows this colour: its own, else one of the whole saree, else the first. Undefined when there are none. */
export function photoForVariant<T extends PhotoLike>(photos: readonly T[] | undefined | null, variantId: string | null | undefined): T | undefined {
  if (!photos || photos.length === 0) return undefined;
  return photos.find((p) => variantId && p.variantId === variantId) ?? photos.find((p) => !p.variantId) ?? photos[0];
}

/** The small copy of that photo, for the bag and lists. Falls back to the large copy. */
export function thumbnailForVariant(photos: readonly PhotoLike[] | undefined | null, variantId: string | null | undefined): string | null {
  const photo = photoForVariant(photos, variantId);
  return photo ? photo.thumbnailUrl || photo.url : null;
}

/** Where a colour's own first photo is in the gallery, or -1 when it has none (the gallery then stays where it is). */
export function firstPhotoIndexOfVariant(photos: readonly PhotoLike[] | undefined | null, variantId: string | null | undefined): number {
  if (!photos || !variantId) return -1;
  return photos.findIndex((p) => p.variantId === variantId);
}

/** One step through a gallery of `count` photos, wrapping round at the ends. */
export function stepPhoto(index: number, count: number, direction: 1 | -1): number {
  if (count <= 0) return 0;
  return (index + direction + count) % count;
}
