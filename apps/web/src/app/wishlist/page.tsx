'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { isLoggedIn, loadToken, addToCart, formatPaise } from '@/lib/api';
import { useWishlist } from '@/lib/wishlist-context';

export default function WishlistPage() {
  const { wishlistItems, toggleWishlist, refreshWishlist, total } = useWishlist();

  useEffect(() => {
    loadToken();
    if (isLoggedIn()) refreshWishlist();
  }, [refreshWishlist]);

  if (!isLoggedIn()) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
        <h1 className="font-serif text-headline-md text-text-primary mb-2">Your Saved Items</h1>
        <p className="font-sans text-body-md text-text-secondary mb-6">Sign in to save your favourite sarees.</p>
        <Link href="/account" className="btn-primary px-8 py-3 rounded-xl font-sans text-title-sm text-white bg-primary hover:bg-primary-dark transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
        <h1 className="font-serif text-headline-md text-text-primary mb-2">No saved items yet</h1>
        <p className="font-sans text-body-md text-text-secondary mb-6">Tap the heart on any saree to save it here.</p>
        <Link href="/shop" className="px-8 py-3 rounded-xl font-sans text-title-sm text-white bg-primary hover:bg-primary-dark transition-colors">
          Browse Sarees
        </Link>
      </div>
    );
  }

  const handleAddToCart = async (variantId: string) => {
    try { await addToCart(variantId, 1); } catch {}
  };

  return (
    <div className="page-container py-6 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center lg:hidden">
          <ArrowLeft size={18} className="text-text-primary" />
        </Link>
        <div>
          <h1 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-text-primary">Saved Items</h1>
          <p className="font-sans text-body-sm text-text-tertiary">{total} {total === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter lg:gap-5">
        {wishlistItems.map((item) => {
          const v = item.variant;
          const p = v.product;
          const discount = v.compareAtPaise && v.compareAtPaise > v.pricePaise
            ? Math.round((1 - v.pricePaise / v.compareAtPaise) * 100)
            : null;
          return (
            <div key={item.id} className="group relative">
              <Link href={`/shop/${p.slug}`}>
                <div className="relative aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden mb-2 group-hover:shadow-md transition-shadow">
                  {discount && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white font-sans text-label-sm font-semibold">
                      {discount}% off
                    </div>
                  )}
                  {!v.isAvailable && (
                    <div className="absolute inset-0 bg-surface/70 flex items-center justify-center">
                      <span className="font-sans text-label-md text-text-secondary font-medium">Out of Stock</span>
                    </div>
                  )}
                </div>
                <p className="font-sans text-body-md text-text-primary font-medium truncate">{p.title}</p>
                <p className="font-sans text-body-sm text-text-secondary truncate">{v.color || v.name || p.origin || ''}</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-sans text-price-md text-accent">{formatPaise(v.pricePaise)}</span>
                  {v.compareAtPaise && v.compareAtPaise > v.pricePaise && (
                    <span className="font-sans text-body-sm text-text-tertiary line-through">{formatPaise(v.compareAtPaise)}</span>
                  )}
                </div>
              </Link>
              <div className="flex gap-2 mt-2">
                {v.isAvailable && (
                  <button
                    onClick={() => handleAddToCart(v.id)}
                    className="flex-1 h-9 rounded-lg bg-primary text-white font-sans text-label-md font-medium flex items-center justify-center gap-1.5 hover:bg-primary-dark transition-colors"
                  >
                    <ShoppingBag size={14} strokeWidth={2} />
                    Add to Bag
                  </button>
                )}
                <button
                  onClick={() => toggleWishlist(v.id)}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-error/10 hover:border-error transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 size={14} className="text-text-tertiary hover:text-error" strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
