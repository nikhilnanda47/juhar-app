'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Heart, ChevronDown } from 'lucide-react';
import { getProducts, getCategories, formatPaise, type Product, type Category } from '@/lib/api';
import { appendUnique } from '@/lib/paging';
import { SORT_OPTIONS, shopQuery, type ShopSort } from '@/lib/shop-list';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<ShopSort>('newest');
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0); // every saree that matches, not just the ones loaded
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  // Only the newest request may change the list (a slow answer for an old search or sort is dropped)
  const requestId = useRef(0);

  useEffect(() => {
    getCategories().then((c) => setCategories(c.filter((cat) => cat.active !== false))).catch(() => {});
  }, []);

  // Wait for a pause in typing before asking the API (one request per word, not per letter)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categoryId = activeCategory ? categories.find((c) => c.slug === activeCategory)?.id ?? null : null;

  // The first page again whenever the category, the search or the sort changes
  useEffect(() => {
    if (activeCategory && !categoryId) return; // categories are still loading
    const mine = ++requestId.current;
    setLoading(true);
    setLoadError('');
    getProducts(shopQuery({ categoryId, search: debouncedSearch, sort }))
      .then((d) => {
        if (mine !== requestId.current) return;
        setProducts(d.items);
        setCursor(d.cursor);
        setHasMore(d.hasMore);
        setTotal(d.total);
      })
      .catch(() => { if (mine === requestId.current) setLoadError('Could not load sarees. Please try again.'); })
      .finally(() => { if (mine === requestId.current) setLoading(false); });
  }, [categoryId, activeCategory, debouncedSearch, sort]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const mine = requestId.current;
    setLoadingMore(true);
    setLoadError('');
    try {
      const d = await getProducts(shopQuery({ categoryId, search: debouncedSearch, sort, cursor }));
      if (mine !== requestId.current) return; // the search or sort changed meanwhile
      setProducts((shown) => appendUnique(shown, d.items));
      setCursor(d.cursor);
      setHasMore(d.hasMore);
      setTotal(d.total);
    } catch {
      setLoadError('Could not load more sarees. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div className="flex items-center justify-between pt-6 lg:pt-8 mb-2">
        <h1 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-text-primary">Shop</h1>
        <span className="label-upper">HANDCRAFTED IN ODISHA</span>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 bg-surface rounded-xl px-4 h-12 lg:h-14 shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-border mb-4 lg:max-w-xl">
        <Search size={20} className="text-text-tertiary" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search sarees, fabrics, techniques..."
          className="flex-1 bg-transparent outline-none font-sans text-body-md text-text-primary placeholder:text-text-tertiary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center">
          <SlidersHorizontal size={18} className="text-text-secondary" strokeWidth={1.5} />
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
        <button
          className={`shrink-0 px-4 py-2 rounded-full font-sans text-label-md transition-all ${
            !activeCategory
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface text-text-secondary hover:bg-surface-container-low'
          }`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`shrink-0 px-4 py-2 rounded-full font-sans text-label-md transition-all ${
              activeCategory === cat.slug
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-text-secondary hover:bg-surface-container-low'
            }`}
            onClick={() => setActiveCategory(cat.slug)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Count and sort */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-sans text-body-sm text-text-secondary">
            {total} {total === 1 ? 'saree' : 'sarees'}
          </span>
        </div>
        <label className="relative flex items-center">
          <span className="sr-only">Sort sarees</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ShopSort)}
            className="appearance-none cursor-pointer rounded-full border border-border bg-surface pl-4 pr-9 py-2 font-sans text-label-md text-text-primary outline-none focus:border-primary"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 text-text-tertiary" strokeWidth={2} />
        </label>
      </div>

      {/* Product grid (dimmed while a new sort, search or category is loading) */}
      <div
        aria-busy={loading}
        className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter lg:gap-5 pb-8 transition-opacity ${loading ? 'opacity-50' : ''}`}
      >
        {products.map((product) => {
          const price = product.startingPricePaise ?? 0;
          const compare = product.compareAtPaise ?? null;
          const lowStock = (product as any).isAvailable === true && (product as any).totalStock > 0 && (product as any).totalStock <= 3;
          return (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="group"
            >
              <div className="relative aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden mb-2 shadow-[0_1px_4px_rgba(0,0,0,0.03)] group-hover:shadow-md transition-shadow">
                {/* Wishlist */}
                <button
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center z-10"
                  onClick={(e) => e.preventDefault()}
                >
                  <Heart size={16} className="text-text-tertiary" strokeWidth={2} />
                </button>
                {/* Origin badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur">
                  <span className="font-sans text-label-sm text-text-primary">{(product as any).fabric || 'Handloom'}</span>
                </div>
              </div>
              <p className="font-sans text-body-md text-text-primary font-medium truncate">{product.title}</p>
              <p className="font-sans text-body-sm text-text-secondary truncate">{(product as any).weaveMethod || (product as any).categorySlug || ''}</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-sans text-price-md text-accent">{formatPaise(price)}</span>
                {compare && compare > price && (
                  <span className="font-sans text-body-sm text-text-tertiary line-through">{formatPaise(compare)}</span>
                )}
              </div>
              {lowStock && (
                <p className="font-sans text-body-sm text-accent mt-0.5">Low stock</p>
              )}
            </Link>
          );
        })}
      </div>

      {products.length === 0 && !loading && !loadError && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
          <p className="section-title mb-2">No sarees found</p>
          <p className="font-sans text-body-md text-text-secondary">Try a different category or search term</p>
        </div>
      )}

      {/* Load more */}
      {products.length > 0 && (
        <div className="flex flex-col items-center gap-3 pb-10 text-center">
          {loadError && <p role="alert" className="font-sans text-body-sm text-error">{loadError}</p>}
          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore} className="btn-outline px-8 disabled:opacity-60">
              {loadingMore ? 'Loading...' : 'Load more sarees'}
            </button>
          )}
          <p className="font-sans text-body-sm text-text-tertiary">
            {hasMore ? `Showing ${products.length} of ${total} sarees` : `All ${products.length} ${products.length === 1 ? 'saree' : 'sarees'} shown`}
          </p>
        </div>
      )}
      {products.length === 0 && !loading && loadError && (
        <p role="alert" className="py-16 text-center font-sans text-body-md text-error">{loadError}</p>
      )}
    </div>
  );
}
