'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Heart } from 'lucide-react';
import { getProducts, getCategories, formatPaise, isLoggedIn, type Product, type Category } from '@/lib/api';
import { useWishlist } from '@/lib/wishlist-context';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    getCategories().then((c) => setCategories(c.filter((cat) => cat.active !== false))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: '20', sortBy: 'newest' };
    if (activeCategory) {
      const cat = categories.find(c => c.slug === activeCategory);
      if (cat) params.categoryId = cat.id;
    }
    if (search) params.search = search;
    getProducts(params).then((d) => setProducts(d.items)).catch(() => {}).finally(() => setLoading(false));
  }, [activeCategory, search, categories]);

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

      {/* Count */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        <span className="font-sans text-body-sm text-text-secondary">{products.length} sarees</span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter lg:gap-5 pb-8">
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
                {(() => {
                  const variantId = product.firstVariantId;
                  const saved = variantId ? isWishlisted(variantId) : false;
                  return (
                    <button
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface/80 backdrop-blur flex items-center justify-center z-10"
                      onClick={(e) => { e.preventDefault(); if (variantId && isLoggedIn()) toggleWishlist(variantId); }}
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

      {products.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
          <p className="section-title mb-2">No sarees found</p>
          <p className="font-sans text-body-md text-text-secondary">Try a different category or search term</p>
        </div>
      )}
    </div>
  );
}
