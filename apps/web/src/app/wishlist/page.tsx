'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { isLoggedIn, addToCart, getCart, formatPaise, referenceOf, messageOf } from '@/lib/api';
import { CART_CHANGED_EVENT } from '@/lib/cart-events';
import { useWishlist } from '@/lib/wishlist-context';
import ErrorReference from '@/components/ErrorReference';

export default function WishlistPage() {
  const { loaded, items, toggleVariant, total, refreshWishlist } = useWishlist();
  const [addingId, setAddingId] = useState<string | null>(null);
  // Which of these are in the bag right now. It is read from the bag itself, so "Go to Bag" goes away
  // when the bag is emptied somewhere else (another tab, the bag page) instead of staying until reload.
  const [inBag, setInBag] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState(''); // the API's reference for the failed request

  // Opening the page always asks again, so it is never older than the last time the customer looked
  useEffect(() => { refreshWishlist(); }, [refreshWishlist]);

  useEffect(() => {
    let alive = true;
    const readBag = () => {
      if (!isLoggedIn()) return;
      getCart().then((cart) => { if (alive) setInBag(new Set(cart.items.map((i) => i.variant.id))); }).catch(() => {});
    };
    readBag();
    window.addEventListener(CART_CHANGED_EVENT, readBag); // the bag changed here (add, remove, order placed)
    window.addEventListener('focus', readBag); // back from another tab or window
    document.addEventListener('visibilitychange', readBag);
    return () => {
      alive = false;
      window.removeEventListener(CART_CHANGED_EVENT, readBag);
      window.removeEventListener('focus', readBag);
      document.removeEventListener('visibilitychange', readBag);
    };
  }, []);

  // Wait for the answer instead of flashing "sign in" at someone who is already logged in
  if (!loaded) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!isLoggedIn()) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
        <h1 className="font-serif text-headline-md text-text-primary mb-2">Your Wishlist</h1>
        <p className="font-sans text-body-md text-text-secondary mb-6">
          {total > 0
            ? `You have ${total} on your wishlist on this device. Sign in to keep ${total === 1 ? 'it' : 'them'} in your account.`
            : 'Sign in to save your favourite sarees.'}
        </p>
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
        <h1 className="font-serif text-headline-md text-text-primary mb-2">Your wishlist is empty</h1>
        <p className="font-sans text-body-md text-text-secondary mb-6">Tap the heart on any saree to save it here.</p>
        <Link href="/shop" className="px-8 py-3 rounded-xl font-sans text-title-sm text-white bg-primary hover:bg-primary-dark transition-colors">
          Browse Sarees
        </Link>
      </div>
    );
  }

  const handleAddToCart = async (variantId: string) => {
    setAddingId(variantId); setError(''); setErrorRef('');
    try {
      await addToCart(variantId, 1);
      setInBag((prev) => new Set(prev).add(variantId)); // the bag change event re-reads it too
    } catch (e) {
      // used to fail without a word
      setError(messageOf(e, 'Could not add this saree to your bag. Please try again.'));
      setErrorRef(referenceOf(e));
    }
    setAddingId(null);
  };

  return (
    <div className="page-container py-6 lg:py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/account" className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center lg:hidden">
          <ArrowLeft size={18} className="text-text-primary" />
        </Link>
        <div>
          <h1 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-text-primary">Wishlist</h1>
          <p className="font-sans text-body-sm text-text-tertiary">{total} {total === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4">
          <p className="font-sans text-body-sm text-error">{error}</p>
          <ErrorReference id={errorRef} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter lg:gap-5">
        {items.map((item) => {
          const v = item.variant;
          const p = v.product;
          const discount = v.compareAtPaise && v.compareAtPaise > v.pricePaise
            ? Math.round((1 - v.pricePaise / v.compareAtPaise) * 100)
            : null;
          const card = (
            <>
              <div className="relative aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden mb-2 group-hover:shadow-md transition-shadow">
                <ProductImage src={v.imageUrl} alt={v.product.title} />
                {discount && v.isListed && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-white font-sans text-label-sm font-semibold">
                    {discount}% off
                  </div>
                )}
                {!v.isAvailable && (
                  <div className="absolute inset-0 bg-surface/70 flex items-center justify-center text-center px-2">
                    <span className="font-sans text-label-md text-text-secondary font-medium">
                      {v.isListed ? 'Out of Stock' : 'No longer available'}
                    </span>
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
            </>
          );
          return (
            <div key={item.id} className="group relative">
              {/* a product that is no longer sold has no page to open */}
              {v.isListed ? <Link href={`/shop/${p.slug}`}>{card}</Link> : <div>{card}</div>}
              <div className="flex gap-2 mt-2">
                {v.isAvailable && (
                  inBag.has(v.id) ? (
                    <Link
                      href="/cart"
                      className="flex-1 h-9 rounded-lg bg-accent text-white font-sans text-label-md font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                    >
                      <ShoppingBag size={14} strokeWidth={2} />
                      Go to Bag
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(v.id)}
                      disabled={addingId === v.id}
                      className="flex-1 h-9 rounded-lg bg-primary text-white font-sans text-label-md font-medium flex items-center justify-center gap-1.5 hover:bg-primary-dark transition-colors disabled:opacity-60"
                    >
                      <ShoppingBag size={14} strokeWidth={2} />
                      {addingId === v.id ? 'Adding...' : 'Add to Bag'}
                    </button>
                  )
                )}
                <button
                  onClick={() => toggleVariant(v.id, p.id)}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-error/10 hover:border-error transition-colors"
                  title="Remove from wishlist"
                  aria-label={`Remove ${p.title} from wishlist`}
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
