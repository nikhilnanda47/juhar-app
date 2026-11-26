// Friendly wording for the errors the API throws as a plain code (`throw new ConflictException('INSUFFICIENT_STOCK')`).
// Without this the code itself reached the customer as the message ("INSUFFICIENT_STOCK").
// The reply now carries the code as `error.code` and a sentence as `error.message`.
import { CART, MEDIA } from '@juhar/shared';

type Wording = string | ((detail?: string) => string);

const CATALOG: Record<string, Wording> = {
  // Checkout and cart (customers see these)
  ADDRESS_NOT_FOUND: 'We could not find that delivery address. Please choose or add an address again.',
  CART_EMPTY: 'Your bag is empty. Add a saree to your bag first.',
  CART_ITEM_NOT_FOUND: 'That saree is no longer in your bag.',
  VARIANT_NOT_FOUND: 'We could not find this saree. It may have been removed.',
  VARIANT_UNAVAILABLE: 'Sorry, this saree is no longer available.',
  INSUFFICIENT_STOCK:
    'Sorry, one of the sarees in your bag is not in stock in the quantity you asked for. Please check your bag and try again.',
  QUANTITY_EXCEEDS_LIMIT: `You can order at most ${CART.MAX_QUANTITY_PER_VARIANT} of one saree.`,

  // Signing in
  LOGIN_NOT_OPEN: 'Juhar is not open to the public yet. Sign-in is limited to the pilot team for now.',

  // Product photos (admin side)
  PHOTO_NOT_AN_IMAGE: 'That file is not a photo we can use. Please choose a JPG, PNG or WebP picture.',
  PHOTO_TOO_LARGE: `That photo is too big. Please choose one under ${MEDIA.MAX_FILE_BYTES / (1024 * 1024)} MB.`,
  PHOTO_TOO_SMALL: `That photo is too small and would look blurry. Please choose one that is at least ${MEDIA.MIN_SIDE_PX} pixels on its shorter side.`,
  PHOTO_LIMIT_REACHED: `A saree can have at most ${MEDIA.MAX_PER_PRODUCT} photos. Remove one before adding another.`,
  MEDIA_NOT_FOUND: 'We could not find that photo. It may have been removed already.',
  MEDIA_VARIANT_MISMATCH: 'That colour does not belong to this saree.',
  MEDIA_ORDER_MISMATCH: 'The photos changed while you were arranging them. Please reload the page and try again.',
  MEDIA_STORAGE_NOT_CONFIGURED: 'Photo storage is not set up on this server yet, so photos cannot be uploaded. Ask whoever runs the server to set it up.',

  // Delivery area
  PIN_NOT_VALID: 'That PIN code does not look right. Please check the 6 digits.',
  PIN_NOT_SERVICEABLE: 'We cannot deliver to this PIN code yet. Please choose another address.',
  COD_NOT_AVAILABLE_HERE: 'Cash on delivery is not available for this PIN code. Please choose another way to pay.',

  // Saved items (wishlist)
  ALREADY_IN_WISHLIST: 'This saree is already in your wishlist.',
  WISHLIST_ITEM_NOT_FOUND: 'That saree is not in your wishlist.',

  // Stock handling (admin side)
  STOCK_WOULD_GO_NEGATIVE: 'That would take the stock below what is already reserved for customers\' orders. Cancel or ship those orders first, or choose a bigger number.',
  STOCK_NO_CHANGE: 'That would not change the stock.',
  STOCK_CHANGE_UNCLEAR: 'Say either how many to add or remove, or the new count, not both.',
  RESERVATION_NOT_FOUND: 'We could not find the stock hold for this order.',
  RESERVATION_ALREADY_PROCESSED: 'The stock hold for this order was already used or released.',
  // already a full sentence after the code, with the SKU and the numbers
  STOCK_MISMATCH: (detail) => detail || 'The stock on the shelf is lower than this order needs. Correct the stock count first.',
};

// A plain code, optionally followed by ": detail" (for example "VARIANT_UNAVAILABLE: JUH-IKT-001")
const CODE_WITH_DETAIL = /^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?::\s*([\s\S]*))?$/;

export interface FriendlyError {
  /** the machine-readable code, for `error.code` */
  code: string;
  /** a sentence a customer can read, for `error.message` */
  message: string;
}

/** The friendly version of a plain-code error message, or null when it is not one we know. */
export function friendlyError(raw: unknown): FriendlyError | null {
  if (typeof raw !== 'string') return null;
  const match = CODE_WITH_DETAIL.exec(raw.trim());
  if (!match) return null;
  const [, code, detail] = match;
  const wording = CATALOG[code];
  if (!wording) return null;
  return { code, message: typeof wording === 'function' ? wording(detail?.trim() || undefined) : wording };
}

/** Every code that has friendly wording (used by a test that checks no thrown code is missing). */
export const KNOWN_ERROR_CODES = Object.keys(CATALOG);
