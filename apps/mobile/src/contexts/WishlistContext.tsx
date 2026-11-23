// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isLoggedIn, getWishlist, toggleWishlistItem,
  type WishlistItem,
} from '../services/api';
import {
  getLocalWishlist, addLocalWishlistItem, removeLocalWishlistItem,
} from '../services/localWishlist';

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

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  const refreshWishlist = useCallback(async () => {
    if (isLoggedIn()) {
      try {
        const data = await getWishlist();
        setWishlistIds(new Set(data.items.map((i) => i.variant.id)));
        setWishlistItems(data.items);
      } catch {}
    } else {
      const ids = await getLocalWishlist();
      setWishlistIds(new Set(ids));
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
    const alreadyIn = wishlistIds.has(variantId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (alreadyIn) next.delete(variantId);
      else next.add(variantId);
      return next;
    });

    if (isLoggedIn()) {
      let toggled = false;
      try {
        await toggleWishlistItem(variantId);
        toggled = true;
        if (alreadyIn) {
          setWishlistItems((prev) => prev.filter((i) => i.variant.id !== variantId));
        } else {
          try {
            const data = await getWishlist();
            setWishlistIds(new Set(data.items.map((i) => i.variant.id)));
            setWishlistItems(data.items);
          } catch {}
        }
      } catch {
        if (!toggled) {
          setWishlistIds((prev) => {
            const next = new Set(prev);
            if (alreadyIn) next.add(variantId);
            else next.delete(variantId);
            return next;
          });
        }
      }
    } else {
      if (alreadyIn) {
        await removeLocalWishlistItem(variantId);
      } else {
        await addLocalWishlistItem(variantId);
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
      total: isLoggedIn() ? wishlistItems.length : wishlistIds.size,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
