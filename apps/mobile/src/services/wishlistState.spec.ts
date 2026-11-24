export {}; // keeps this file a module
import {
  isProductSaved, isVariantSaved, mergeGuestWishlist, parseGuestWishlist, savedVariantsOf, toggleEntry, withEntry, type SavedEntry,
} from './wishlistState';
import { notifyAuthChanged, onAuthChanged } from './authEvents';

const red: SavedEntry = { variantId: 'v-red', productId: 'p-1' };
const blue: SavedEntry = { variantId: 'v-blue', productId: 'p-1' };
const teal: SavedEntry = { variantId: 'v-teal', productId: 'p-2' };

describe('saved items: hearts', () => {
  it('toggling saves, then removes', () => {
    const saved = toggleEntry([], red);
    expect(saved).toEqual([red]);
    expect(toggleEntry(saved, red)).toEqual([]);
  });

  it('toggling one colour leaves the others alone and does not change the original list', () => {
    const list = [red, teal];
    expect(toggleEntry(list, blue)).toEqual([red, teal, blue]);
    expect(toggleEntry(list, red)).toEqual([teal]);
    expect(list).toEqual([red, teal]);
  });

  it('the heart on a product page is per colour', () => {
    expect(isVariantSaved([red], 'v-red')).toBe(true);
    expect(isVariantSaved([red], 'v-blue')).toBe(false);
  });

  it('the heart on a shop card is per saree: filled when ANY colour is saved', () => {
    expect(isProductSaved([blue], 'p-1')).toBe(true);
    expect(isProductSaved([blue], 'p-2')).toBe(false);
    expect(isProductSaved([], 'p-1')).toBe(false);
  });

  it('knows which colours of a saree are saved (the product page opens on one of them)', () => {
    expect(savedVariantsOf([red, teal, blue], 'p-1')).toEqual(['v-red', 'v-blue']);
    expect(savedVariantsOf([teal], 'p-1')).toEqual([]);
  });
});

describe('saved items: reading the guest list back from storage', () => {
  it('reads what was written', () => {
    expect(parseGuestWishlist(JSON.stringify([red, teal]))).toEqual([red, teal]);
  });

  it('reads nothing from empty, damaged or odd data instead of crashing', () => {
    expect(parseGuestWishlist(null)).toEqual([]);
    expect(parseGuestWishlist('')).toEqual([]);
    expect(parseGuestWishlist('{not json')).toEqual([]);
    expect(parseGuestWishlist(JSON.stringify({ variantId: 'x' }))).toEqual([]);
    expect(parseGuestWishlist(JSON.stringify([red, { variantId: 5 }, null, 'text', teal]))).toEqual([red, teal]);
  });

  it('an old list of plain ids (the first version stored only those) is ignored, not crashed on', () => {
    expect(parseGuestWishlist(JSON.stringify(['v-1', 'v-2']))).toEqual([]);
  });
});

describe('saved items: moving a guest\'s hearts into the account at login', () => {
  it('saves only what the account does not have yet', async () => {
    const save = jest.fn(async () => ({}));
    const result = await mergeGuestWishlist([red, blue, teal], ['v-blue'], save);
    expect(save.mock.calls.map((c: any[]) => c[0])).toEqual(['v-red', 'v-teal']);
    expect(result).toEqual({ moved: ['v-red', 'v-teal'], failed: [] });
  });

  it('does nothing for an empty guest list or when the account has it all', async () => {
    const save = jest.fn(async () => ({}));
    expect(await mergeGuestWishlist([], ['v-red'], save)).toEqual({ moved: [], failed: [] });
    expect(await mergeGuestWishlist([red], ['v-red'], save)).toEqual({ moved: [], failed: [] });
    expect(save).not.toHaveBeenCalled();
  });

  it('one that cannot be saved (no longer sold) does not stop the rest', async () => {
    const save = jest.fn(async (id: string) => { if (id === 'v-blue') throw new Error('VARIANT_NOT_FOUND'); });
    const result = await mergeGuestWishlist([red, blue, teal], [], save);
    expect(result).toEqual({ moved: ['v-red', 'v-teal'], failed: ['v-blue'] });
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('saves a colour that appears twice in the guest list only once', async () => {
    const save = jest.fn(async () => ({}));
    await mergeGuestWishlist([red, red], [], save);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('login and logout announcements', () => {
  it('tells every listener, and stops telling one that stopped listening', () => {
    const a = jest.fn();
    const b = jest.fn();
    const stopA = onAuthChanged(a);
    const stopB = onAuthChanged(b);
    notifyAuthChanged();
    stopA();
    notifyAuthChanged();
    stopB();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('one broken listener does not stop the others', () => {
    const good = jest.fn();
    const stopBad = onAuthChanged(() => { throw new Error('boom'); });
    const stopGood = onAuthChanged(good);
    expect(() => notifyAuthChanged()).not.toThrow();
    stopBad(); stopGood();
    expect(good).toHaveBeenCalledTimes(1);
  });
});

describe('saved items: setting a colour saved or not saved', () => {
  it('adds a colour that is missing, and leaves one that is there alone', () => {
    expect(withEntry([red], blue, true)).toEqual([red, blue]);
    expect(withEntry([red, blue], blue, true)).toEqual([red, blue]);
  });

  it('removes a colour that is there, and leaves a missing one alone', () => {
    expect(withEntry([red, blue], blue, false)).toEqual([red]);
    expect(withEntry([red], blue, false)).toEqual([red]);
  });

  it('applied once per colour it removes every saved colour of a saree, even from an out-of-date list', () => {
    // the shop card removes each saved colour in turn; each step starts from the list as it is NOW
    let list = [red, blue, teal];
    for (const variantId of savedVariantsOf(list, 'p-1')) list = withEntry(list, { variantId, productId: 'p-1' }, false);
    expect(list).toEqual([teal]);
  });
});
