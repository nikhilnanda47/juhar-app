// Saved items (wishlist): the pieces that do not need React, so they can be tested.
//
// A saved item is one variant (one colour) of a product. The hearts on the shop cards work on the
// whole product ("is any colour of this saree saved?"), the heart on the product page on the colour
// that is selected, and the list shows the colours that were saved.

export interface SavedEntry {
  variantId: string;
  productId: string;
}

/** The entry with this variant removed if it is there, added if it is not. */
export function toggleEntry(list: SavedEntry[], entry: SavedEntry): SavedEntry[] {
  return list.some((e) => e.variantId === entry.variantId)
    ? list.filter((e) => e.variantId !== entry.variantId)
    : [...list, entry];
}

/** The list with this entry present (saved = true) or absent (saved = false), whatever it was before. */
export function withEntry(list: SavedEntry[], entry: SavedEntry, saved: boolean): SavedEntry[] {
  const has = list.some((e) => e.variantId === entry.variantId);
  if (saved) return has ? list : [...list, entry];
  return has ? list.filter((e) => e.variantId !== entry.variantId) : list;
}

export function isVariantSaved(list: SavedEntry[], variantId: string): boolean {
  return list.some((e) => e.variantId === variantId);
}

/** Is any colour of this product saved? */
export function isProductSaved(list: SavedEntry[], productId: string): boolean {
  return list.some((e) => e.productId === productId);
}

/** The saved colours of one product (usually one). */
export function savedVariantsOf(list: SavedEntry[], productId: string): string[] {
  return list.filter((e) => e.productId === productId).map((e) => e.variantId);
}

/** What was read back from storage, keeping only well-formed entries. */
export function parseGuestWishlist(raw: string | null): SavedEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SavedEntry => !!e && typeof e.variantId === 'string' && typeof e.productId === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Moves what a guest saved into the account they just logged in to (like the guest bag).
 * Only what the account does not have yet is added; one failure (a saree that is no longer sold)
 * does not stop the rest. Returns what could not be moved.
 */
export async function mergeGuestWishlist(
  guest: SavedEntry[],
  accountVariantIds: string[],
  save: (variantId: string) => Promise<unknown>,
): Promise<{ moved: string[]; failed: string[] }> {
  const have = new Set(accountVariantIds);
  const moved: string[] = [];
  const failed: string[] = [];
  for (const entry of guest) {
    if (have.has(entry.variantId)) continue;
    try {
      await save(entry.variantId);
      moved.push(entry.variantId);
      have.add(entry.variantId);
    } catch {
      failed.push(entry.variantId);
    }
  }
  return { moved, failed };
}
