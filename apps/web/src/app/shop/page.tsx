'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProductImage from '@/components/ProductImage';
import { Search, SlidersHorizontal, Heart, ChevronDown, X } from 'lucide-react';
import { getProducts, getCategories, getProductFilters, formatPaise, type Product, type Category, type ProductFilterOptions } from '@/lib/api';
import { appendUnique } from '@/lib/paging';
import {
  NO_FILTERS, SORT_OPTIONS, activeFilterCount, effectiveSearch, filterChips, priceRangeError,
  removeFilter, shopQuery, type ShopFilters, type ShopSort,
} from '@/lib/shop-list';
import { useWishlist } from '@/lib/wishlist-context';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<ShopSort>('newest');
  const [filters, setFilters] = useState<ShopFilters>(NO_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ShopFilters>(NO_FILTERS); // `filters` after a pause in typing
  const [filterOptions, setFilterOptions] = useState<ProductFilterOptions | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isProductSaved, toggleProduct } = useWishlist();
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

  // What the filters can be chosen from (read from the catalog, so a choice always matches something)
  useEffect(() => {
    getProductFilters().then(setFilterOptions).catch(() => {});
  }, []);

  // Wait for a pause in typing before asking the API (one request per word, not per letter)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Same for the price boxes; the dropdown choices take effect at once
  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), 400);
    return () => clearTimeout(timer);
  }, [filters]);
  const filtersKey = JSON.stringify(shopQuery({ filters: appliedFilters })); // changes only when what is sent changes

  const searchTerm = effectiveSearch(debouncedSearch); // a single letter is not searched
  const chips = filterChips(filters);
  const filterCount = activeFilterCount(filters);
  const priceError = priceRangeError(filters);
  const categoryId = activeCategory ? categories.find((c) => c.slug === activeCategory)?.id ?? null : null;

  // The first page again whenever the category, the search or the sort changes
  useEffect(() => {
    if (activeCategory && !categoryId) return; // categories are still loading
    const mine = ++requestId.current;
    setLoading(true);
    setLoadError('');
    getProducts(shopQuery({ categoryId, search: searchTerm, sort, filters: appliedFilters }))
      .then((d) => {
        if (mine !== requestId.current) return;
        setProducts(d.items);
        setCursor(d.cursor);
        setHasMore(d.hasMore);
        setTotal(d.total);
      })
      .catch(() => { if (mine === requestId.current) setLoadError('Could not load sarees. Please try again.'); })
      .finally(() => { if (mine === requestId.current) setLoading(false); });
  }, [categoryId, activeCategory, searchTerm, sort, filtersKey]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const mine = requestId.current;
    setLoadingMore(true);
    setLoadError('');
    try {
      const d = await getProducts(shopQuery({ categoryId, search: searchTerm, sort, filters: appliedFilters, cursor }));
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
        {search && (
          <button onClick={() => setSearch('')} aria-label="Clear search" className="text-text-tertiary hover:text-text-primary">
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        <button
          onClick={() => setFiltersOpen((open) => !open)}
          aria-label="Filters"
          aria-expanded={filtersOpen}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center ${filtersOpen || filterCount > 0 ? 'bg-primary text-white' : 'bg-surface-container-low text-text-secondary'}`}
        >
          <SlidersHorizontal size={18} strokeWidth={1.5} />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-accent text-white font-sans text-[10px] font-bold flex items-center justify-center px-1">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="card mb-4 lg:max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ['fabric', 'Fabric', 'Any fabric', filterOptions?.fabrics ?? []],
              ['weaveMethod', 'Weave', 'Any weave', filterOptions?.weaveMethods ?? []],
              ['color', 'Colour', 'Any colour', filterOptions?.colors ?? []],
            ] as const).map(([key, label, any, options]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="font-sans text-label-md text-text-secondary">{label}</span>
                <select
                  value={filters[key] ?? ''}
                  onChange={(e) => setFilters({ ...filters, [key]: e.target.value || null })}
                  className="rounded-lg border border-border bg-surface px-3 py-2 font-sans text-body-md text-text-primary outline-none focus:border-primary"
                >
                  <option value="">{any}</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 sm:max-w-sm">
            {([['minRupees', 'Lowest price (₹)'], ['maxRupees', 'Highest price (₹)']] as const).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="font-sans text-label-md text-text-secondary">{label}</span>
                <input
                  inputMode="numeric"
                  placeholder={key === 'minRupees' && filterOptions?.minPricePaise != null ? String(Math.floor(filterOptions.minPricePaise / 100)) : key === 'maxRupees' && filterOptions?.maxPricePaise != null ? String(Math.ceil(filterOptions.maxPricePaise / 100)) : ''}
                  value={filters[key]}
                  onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                  className="rounded-lg border border-border bg-surface px-3 py-2 font-sans text-body-md text-text-primary outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          {priceError && <p role="alert" className="font-sans text-body-sm text-error mt-2">{priceError}</p>}
          {(filterCount > 0 || filters.minRupees !== '' || filters.maxRupees !== '') && (
            <button onClick={() => setFilters(NO_FILTERS)} className="mt-3 font-sans text-label-md text-primary hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Filters that are on */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilters(removeFilter(filters, chip.key))}
              aria-label={`Remove filter ${chip.label}`}
              className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 font-sans text-label-md text-text-primary"
            >
              {chip.label}
              <X size={14} strokeWidth={2} />
            </button>
          ))}
        </div>
      )}

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
                <ProductImage src={product.primaryImage?.url} alt={product.primaryImage?.alt || product.title} />
                {/* Wishlist */}
                {/* the heart is for the whole saree: filled when any colour of it is saved */}
                {(() => {
                  const saved = isProductSaved(product.id);
                  return (
                    <button
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center z-10"
                      onClick={(e) => { e.preventDefault(); toggleProduct(product.id, product.firstVariantId); }}
                      aria-label={saved ? 'Remove from wishlist' : 'Save this saree'}
                      aria-pressed={saved}
                    >
                      <Heart size={16} className={saved ? 'text-primary fill-primary' : 'text-text-tertiary'} strokeWidth={2} />
                    </button>
                  );
                })()}
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
          <p className="section-title mb-2">{searchTerm ? `No results for "${searchTerm}"` : 'No sarees found'}</p>
          <p className="font-sans text-body-md text-text-secondary mb-4">
            {searchTerm || filterCount > 0 ? 'Try a different search or fewer filters' : 'Try a different category'}
          </p>
          {(searchTerm || filterCount > 0 || activeCategory) && (
            <button
              onClick={() => { setSearch(''); setFilters(NO_FILTERS); setActiveCategory(null); }}
              className="btn-outline px-8"
            >
              Browse all
            </button>
          )}
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
