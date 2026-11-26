'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { loadToken, getCart } from './api';
import { readLocalCart } from './cart-events';
import { startCartRefresh } from './cart-refresh';

interface CartContextType {
  itemCount: number;
  refreshCount: () => void;
}

const CartContext = createContext<CartContextType>({ itemCount: 0, refreshCount: () => {} });

export function CartProvider({ children }: { children: ReactNode }) {
  const [itemCount, setItemCount] = useState(0);
  const latest = useRef(0);

  const refreshCount = useCallback(async () => {
    // If two refreshes overlap, only the newest one may update the badge
    const id = ++latest.current;
    const localCount = () => readLocalCart().reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);
    let count: number;
    try {
      count = loadToken() ? (await getCart()).itemCount : localCount();
    } catch {
      count = localCount(); // fall back to the guest cart
    }
    if (id === latest.current) setItemCount(count);
  }, []);

  // Refresh once now, then only when the cart changes, the customer returns, or every 5 minutes
  useEffect(() => {
    refreshCount();
    return startCartRefresh(refreshCount);
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
