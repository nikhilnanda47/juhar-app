import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getWishlist, isLoggedIn, loadToken, toggleWishlistItem, type WishlistItem } from '../services/api';
import { onAuthChanged } from '../services/authEvents';
import { startWishlistRefresh } from '../services/wishlistRefresh';
import { getLocalWishlist, saveLocalWishlist } from '../services/localWishlist';
import {
  isProductSaved, isVariantSaved, mergeGuestWishlist, savedVariantsOf, withEntry, type SavedEntry,
} from '../services/wishlistState';

interface WishlistContextValue {
  /** false until the first answer is in (the Saved screen waits for this instead of saying "no saved items") */
  loaded: boolean;
  /** the saved items with their details (logged-in customers; a guest's hearts have no details) */
  items: WishlistItem[];
  /** how many saved items: the account's, or the guest's own */
  total: number;
  isSaved: (variantId: string) => boolean;
  /** is any colour of this product saved? (the heart on a shop card) */
  isProductSaved: (productId: string) => boolean;
  /** a saved colour of this product, if any (the product page opens on it) */
  savedVariantOf: (productId: string) => string | null;
  /** the heart on a product page: save or remove this colour */
  toggleVariant: (variantId: string, productId: string) => Promise<void>;
  /** the heart on a shop card: remove the saved colours of this product, or save its main colour */
  toggleProduct: (productId: string, firstVariantId: string | null | undefined) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue>({
  loaded: false,
  items: [],
  total: 0,
  isSaved: () => false,
  isProductSaved: () => false,
  savedVariantOf: () => null,
  toggleVariant: async () => {},
  toggleProduct: async () => {},
  refreshWishlist: async () => {},
});

const entriesOf = (list: WishlistItem[]): SavedEntry[] =>
  list.map((i) => ({ variantId: i.variant.id, productId: i.variant.product.id }));

/** The saved token is read from storage asynchronously, so "logged in?" is only trustworthy after this. */
async function hasLogin(): Promise<boolean> {
  return isLoggedIn() || (await loadToken());
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const savedRef = useRef<SavedEntry[]>([]); // the same list, readable at once (state is only updated on the next render)
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // taps that are still waiting for the server, so a second tap on the same heart waits its turn
  const busy = useRef<Set<string>>(new Set());
  // Only the newest refresh may change what is shown (a slow answer from before a logout is dropped)
  const refreshId = useRef(0);

  const refreshWishlist = useCallback(async () => {
    const mine = ++refreshId.current;
    // The app used to decide "guest" before the saved login had been read, so a logged-in customer
    // opened the app to an empty list and every heart went to the guest list instead of the account.
    if (!(await hasLogin())) {
      const guest = await getLocalWishlist();
      if (mine !== refreshId.current) return;
      setItems([]);
      savedRef.current = guest;
      setSaved(guest);
      setLoaded(true);
      return;
    }
    try {
      // What the customer saved before logging in moves into the account first
      const guest = await getLocalWishlist();
      if (guest.length > 0) {
        const account = await getWishlist();
        await mergeGuestWishlist(guest, account.items.map((i) => i.variant.id), toggleWishlistItem);
        await saveLocalWishlist([]);
      }
      const data = await getWishlist();
      if (mine !== refreshId.current) return;
      setItems(data.items);
      savedRef.current = entriesOf(data.items);
      setSaved(savedRef.current);
    } catch {
      // not signed in any more, or the server is down: keep what is shown
    } finally {
      if (mine === refreshId.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  // Changes made somewhere else (the website, another device) show up without a restart: when the app
  // comes back to the foreground and every 30 seconds while it is open. (The screens also refresh when
  // they come into view.) A refresh never runs in the middle of a tap on this phone.
  useEffect(() => {
    return startWishlistRefresh({
      refresh: () => { if (busy.current.size === 0) refreshWishlist(); },
      onForeground: (listener) => {
        const subscription = AppState.addEventListener('change', (state) => {
          if (state === 'active') listener();
        });
        return () => subscription.remove();
      },
      isActive: () => AppState.currentState === 'active',
    });
  }, [refreshWishlist]);

  // A login or a logout: show the right person's saved items at once
  useEffect(
    () => onAuthChanged(() => { setLoaded(false); refreshWishlist(); }),
    [refreshWishlist],
  );

  /** Change what is shown right now (synchronously, so a second tap in the same moment sees it). */
  const apply = useCallback((change: (list: SavedEntry[]) => SavedEntry[]) => {
    savedRef.current = change(savedRef.current);
    setSaved(savedRef.current);
  }, []);

  /** Save or remove one colour, on the server when logged in, on this phone when not. */
  const toggleVariant = useCallback(async (variantId: string, productId: string) => {
    if (busy.current.has(variantId)) return;
    busy.current.add(variantId);
    const entry = { variantId, productId };
    const wasSaved = isVariantSaved(savedRef.current, variantId);
    try {
      if (!(await hasLogin())) {
        apply((list) => withEntry(list, entry, !wasSaved));
        await saveLocalWishlist(savedRef.current);
        return;
      }

      apply((list) => withEntry(list, entry, !wasSaved)); // show the heart at once
      try {
        const answer = await toggleWishlistItem(variantId);
        apply((list) => withEntry(list, entry, answer.wishlisted)); // the server's answer decides (another device may have changed it)
        if (!answer.wishlisted) setItems((now) => now.filter((i) => i.variant.id !== variantId)); // gone from the list at once
        // then read the list again: it needs the details of a new item, and it also picks up anything
        // saved elsewhere in the meantime, so after a tap the screen always matches the account
        const data = await getWishlist().catch(() => null);
        if (data) { setItems(data.items); apply(() => entriesOf(data.items)); }
      } catch {
        apply((list) => withEntry(list, entry, wasSaved)); // the server said no: put the heart back
      }
    } finally {
      busy.current.delete(variantId);
    }
  }, [apply]);

  const toggleProduct = useCallback(async (productId: string, firstVariantId: string | null | undefined) => {
    const savedColours = savedVariantsOf(savedRef.current, productId);
    if (savedColours.length > 0) {
      for (const variantId of savedColours) await toggleVariant(variantId, productId);
    } else if (firstVariantId) {
      await toggleVariant(firstVariantId, productId);
    }
  }, [toggleVariant]);

  return (
    <WishlistContext.Provider value={{
      loaded,
      items,
      total: saved.length,
      isSaved: (variantId) => isVariantSaved(saved, variantId),
      isProductSaved: (productId) => isProductSaved(saved, productId),
      savedVariantOf: (productId) => savedVariantsOf(saved, productId)[0] ?? null,
      toggleVariant,
      toggleProduct,
      refreshWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
