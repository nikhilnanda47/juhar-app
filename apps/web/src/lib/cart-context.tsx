'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { loadToken, getCart } from './api';

interface CartContextType {
  itemCount: number;
  refreshCount: () => void;
}

const CartContext = createContext<CartContextType>({ itemCount: 0, refreshCount: () => {} });

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      if (loadToken()) {
        const cart = await getCart();
        setItemCount(cart.itemCount);
      } else {
        // Check local cart
        if (typeof window !== 'undefined') {
          const local = JSON.parse(localStorage.getItem('sajani_local_cart') || '[]');
          setItemCount(local.reduce((sum: number, i: any) => sum + i.quantity, 0));
        }
      }
    } catch {
      // Fallback to local cart
      if (typeof window !== 'undefined') {
        const local = JSON.parse(localStorage.getItem('sajani_local_cart') || '[]');
        setItemCount(local.reduce((sum: number, i: any) => sum + i.quantity, 0));
      }
    }
  }, []);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  // Listen for storage changes (local cart updates)
  useEffect(() => {
    const onStorage = () => refreshCount();
    window.addEventListener('storage', onStorage);
    // Also poll every 2s for same-tab updates
    const interval = setInterval(refreshCount, 2000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, [refreshCount]);

  return (
    <CartContext.Provider value={{ itemCount, refreshCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartCount() {
  return useContext(CartContext);
}
