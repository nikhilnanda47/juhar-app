'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { isLoggedIn, getWishlist, toggleWishlistItem, type WishlistItem } from './api';

interface WishlistContextValue {
  wishlistIds: Set<string>;
  wishlistItems: WishlistItem[];
  isWishlisted: (variantId: string) => boolean;
  toggleWishlist: (variantId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  total: number;
}

const WishlistContext = createContext<WishlistContextValue>({
  wishlistIds: new Set(),
  wishlistItems: [],
  isWishlisted: () => false,
  toggleWishlist: async () => {},
  refreshWishlist: async () => {},
  total: 0,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const refreshWishlist = useCallback(async () => {
    if (!isLoggedIn()) {
      setWishlistIds(new Set());
      setWishlistItems([]);
      return;
    }
    try {
      const data = await getWishlist();
      const ids = new Set(data.items.map((i) => i.variant.id));
      setWishlistIds(ids);
      setWishlistItems(data.items);
    } catch {
      // silently fail — user may not be authenticated yet
    }
  }, []);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isWishlisted = useCallback(
    (variantId: string) => wishlistIds.has(variantId),
    [wishlistIds],
  );

  const toggleWishlist = useCallback(async (variantId: string) => {
    if (!isLoggedIn()) return;

    const alreadyIn = wishlistIds.has(variantId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (alreadyIn) next.delete(variantId);
      else next.add(variantId);
      return next;
    });

    let toggled = false;
    try {
      await toggleWishlistItem(variantId);
      toggled = true;
      if (alreadyIn) {
        setWishlistItems((prev) => prev.filter((i) => i.variant.id !== variantId));
      } else {
        // Best-effort refresh for full item data; don't roll back if this fails
        try {
          const data = await getWishlist();
          setWishlistIds(new Set(data.items.map((i) => i.variant.id)));
          setWishlistItems(data.items);
        } catch {}
      }
    } catch {
      // Only roll back if the toggle itself failed
      if (!toggled) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (alreadyIn) next.add(variantId);
          else next.delete(variantId);
          return next;
        });
      }
    }
  }, [wishlistIds]);

  return (
    <WishlistContext.Provider value={{
      wishlistIds,
      wishlistItems,
      isWishlisted,
      toggleWishlist,
      refreshWishlist,
      total: wishlistItems.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
