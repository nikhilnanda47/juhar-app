'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Trash2, Minus, Plus, Truck, ArrowRight, Leaf } from 'lucide-react';
import { loadToken, getCart, getProductBySlug, updateCartItem, removeCartItem, formatPaise, type CartResponse } from '@/lib/api';
import { readLocalCart, saveLocalCart, type LocalCartItem } from '@/lib/cart-events';
import { remainingForFreeShipping, shippingFor, shippingProgressPercent, useShippingRule } from '@/lib/shipping';
import { useWishlist } from '@/lib/wishlist-context';
import ProductImage from '@/components/ProductImage';


const getLocalCart = readLocalCart;

function localToCartResponse(items: LocalCartItem[]): CartResponse {
  const cartItems = items.map((item) => ({
    id: `local-${item.variantId}`,
    variant: {
      id: item.variantId, sku: item.sku, name: item.variantName,
      color: item.color, pricePaise: item.pricePaise,
      compareAtPaise: item.compareAtPaise, available: item.available,
      productId: item.productId, productTitle: item.productTitle, productSlug: item.productSlug, imageUrl: item.imageUrl ?? null,
    },
    quantity: item.quantity,
    lineTotalPaise: item.pricePaise * item.quantity,
    isAvailable: item.available > 0,
  }));
  return {
    items: cartItems,
    subtotalPaise: cartItems.reduce((s, i) => s + i.lineTotalPaise, 0),
    itemCount: cartItems.reduce((s, i) => s + i.quantity, 0),
  };
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [wishlistBusy, setWishlistBusy] = useState<Set<string>>(new Set());
  const { rule, loaded: ruleLoaded } = useShippingRule();
  const { isSaved, toggleVariant } = useWishlist();

  const handleWishlistToggle = async (item: CartResponse['items'][number]) => {
    const variantId = item.variant.id;
    if (wishlistBusy.has(variantId)) return;
    setWishlistBusy((prev) => new Set(prev).add(variantId));
    try {
      // The heart on the shop card is per saree, so a save needs to know which saree this colour is from.
      // Bags saved before the bag carried it look it up by the saree's page address.
      const productId = item.variant.productId || (await getProductBySlug(item.variant.productSlug)).id;
      await toggleVariant(variantId, productId);
    } catch { /* could not look it up: nothing was saved, the heart stays as it was */ }
    setWishlistBusy((prev) => { const next = new Set(prev); next.delete(variantId); return next; });
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    const hasToken = loadToken();
    setLoggedIn(hasToken);
    try {
      if (hasToken) setCart(await getCart());
      else setCart(localToCartResponse(getLocalCart()));
    } catch { setCart({ items: [], subtotalPaise: 0, itemCount: 0 }); }
    setLoading(false);
  };

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    setUpdating(itemId);
    try {
      if (loggedIn) {
        setCart(newQty <= 0 ? await removeCartItem(itemId) : await updateCartItem(itemId, newQty));
      } else {
        const variantId = itemId.replace('local-', '');
        let items = getLocalCart();
        if (newQty <= 0) items = items.filter((c) => c.variantId !== variantId);
        else { const item = items.find((c) => c.variantId === variantId); if (item) item.quantity = newQty; }
        saveLocalCart(items);
        setCart(localToCartResponse(items));
      }
    } catch {}
    setUpdating(null);
  };

  const handleRemove = async (itemId: string) => {
    setUpdating(itemId);
    try {
      if (loggedIn) setCart(await removeCartItem(itemId));
      else {
        const variantId = itemId.replace('local-', '');
        const items = getLocalCart().filter((c) => c.variantId !== variantId);
        saveLocalCart(items);
        setCart(localToCartResponse(items));
      }
    } catch {}
    setUpdating(null);
  };

  if (loading || !ruleLoaded) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-margin text-center">
        <ShoppingBag size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
        <h2 className="section-title mb-2">Your bag is empty</h2>
        <p className="font-sans text-body-md text-text-secondary mb-6">Browse our collection and add something you love.</p>
        <button onClick={() => router.push('/shop')} className="btn-outline px-8">Start Shopping</button>
      </div>
    );
  }

  // null = the shipping rule could not be loaded; show "at checkout" instead of guessing
  const shippingPaise = rule ? shippingFor(cart.subtotalPaise, rule) : null;
  const totalPaise = cart.subtotalPaise + (shippingPaise ?? 0);
  const freeShippingMet = shippingPaise === 0;
  const shippingProgress = rule ? shippingProgressPercent(cart.subtotalPaise, rule) : 0;

  return (
    <div className="page-container lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:py-8">
      <div>
        <h1 className="font-sans text-title-sm text-text-primary mb-4 pt-4 lg:pt-0">My Bag ({cart.itemCount})</h1>

        {/* Shipping meter */}
        {rule && <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-accent" strokeWidth={2} />
              <span className="font-sans text-body-sm text-accent font-medium">
                {freeShippingMet ? 'Free delivery unlocked!' : `₹${(remainingForFreeShipping(cart.subtotalPaise, rule) / 100).toLocaleString('en-IN')} more for free shipping`}
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${shippingProgress}%` }} />
          </div>
        </div>}

        {/* Items */}
        {cart.items.map((item) => {
          const discount = item.variant.compareAtPaise && item.variant.compareAtPaise > item.variant.pricePaise
            ? Math.round((1 - item.variant.pricePaise / item.variant.compareAtPaise) * 100) : null;
          return (
            <div key={item.id} className="card mb-3">
              <div className="flex gap-3">
                <div className="relative w-20 h-[106px] rounded-lg bg-surface-container-low overflow-hidden shrink-0">
                  <ProductImage src={item.variant.imageUrl} alt={item.variant.productTitle} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p className="font-sans text-body-md text-text-primary font-semibold truncate">{item.variant.productTitle}</p>
                    <button onClick={() => handleRemove(item.id)}>
                      <Trash2 size={18} className="text-text-tertiary hover:text-error transition-colors" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="font-sans text-body-sm text-text-secondary mt-0.5">
                    {[item.variant.color ? `Color: ${item.variant.color}` : null, item.variant.name].filter(Boolean).join(' • ')}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-sans text-price-md text-text-primary">{formatPaise(item.variant.pricePaise)}</span>
                    {item.variant.compareAtPaise && item.variant.compareAtPaise > item.variant.pricePaise && (
                      <span className="font-sans text-body-sm text-text-tertiary line-through">{formatPaise(item.variant.compareAtPaise)}</span>
                    )}
                    {discount && <span className="font-sans text-label-sm text-primary">{discount}% off</span>}
                  </div>
                </div>
              </div>
              {/* Stepper + Wishlist */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <div className="flex items-center bg-surface-container-low rounded-lg">
                  <button
                    className="w-8 h-8 flex items-center justify-center"
                    onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                    disabled={updating === item.id}
                  >
                    <Minus size={14} className="text-text-primary" />
                  </button>
                  <span className="w-8 text-center font-sans text-body-md font-semibold">
                    {updating === item.id ? '…' : item.quantity}
                  </span>
                  <button
                    className="w-8 h-8 flex items-center justify-center"
                    onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                    disabled={updating === item.id}
                  >
                    <Plus size={14} className="text-text-primary" />
                  </button>
                </div>
                <button
                  onClick={() => handleWishlistToggle(item)}
                  disabled={wishlistBusy.has(item.variant.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                    isSaved(item.variant.id)
                      ? 'text-primary'
                      : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  <Heart
                    size={15}
                    strokeWidth={1.5}
                    fill={isSaved(item.variant.id) ? 'currentColor' : 'none'}
                  />
                  <span className="font-sans text-body-sm font-medium">
                    {isSaved(item.variant.id) ? 'Saved' : 'Save to Wishlist'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price summary sidebar (desktop) / bottom section (mobile) */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="card">
          <h3 className="font-sans text-title-sm text-text-primary mb-3">Price Details ({cart.itemCount} Items)</h3>
          <div className="flex justify-between mb-2">
            <span className="font-sans text-body-md text-text-secondary">Subtotal</span>
            <span className="font-sans text-body-md text-text-primary">{formatPaise(cart.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-sans text-body-md text-text-secondary">Shipping</span>
            <span className={`font-sans text-body-md ${shippingPaise === 0 ? 'text-accent font-semibold' : 'text-text-primary'}`}>
              {shippingPaise === null ? 'At checkout' : shippingPaise === 0 ? 'FREE' : formatPaise(shippingPaise)}
            </span>
          </div>
          <div className="h-px bg-border my-3" />
          <div className="flex justify-between items-start">
            <div>
              <p className="font-sans text-title-sm text-text-primary">Total Amount</p>
              <p className="font-sans text-body-sm text-text-tertiary">{shippingPaise === null ? 'Shipping is added at checkout' : 'Inclusive of all taxes'}</p>
            </div>
            <span className="font-serif text-price-lg text-text-primary">{formatPaise(totalPaise)}</span>
          </div>
          {freeShippingMet && (
            <div className="flex items-center gap-2 bg-surface-container-low rounded-lg p-2.5 mt-3">
              <Leaf size={16} className="text-accent" />
              <span className="font-sans text-body-sm text-accent font-medium">Free shipping applied</span>
            </div>
          )}
          <button
            onClick={() => {
              if (!loggedIn) { router.push('/account'); return; }
              router.push('/checkout/address');
            }}
            className="btn-primary w-full mt-4"
          >
            Proceed to Checkout
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
