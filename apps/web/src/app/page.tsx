'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProducts, getCategories, formatPaise, type Product, type Category } from '@/lib/api';

export default function HomePage() {
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getProducts({ limit: '8', sortBy: 'newest' }).then((d) => setNewArrivals(d.items)).catch(() => {});
    getCategories().then((c) => setCategories(c.filter((cat) => cat.active !== false))).catch(() => {});
  }, []);

  return (
    <div className="page-container">
      {/* Sub-header — mobile only */}
      <div className="flex items-center justify-between px-margin py-3 lg:hidden">
        <div className="flex items-center gap-space-xs">
          <span className="font-serif text-headline-md text-primary">Juhar</span>
          <span className="font-sans text-body-md text-on-surface-variant/80">ଜୁହାର୍</span>
        </div>
        <span className="label-upper">WESTERN ODISHA</span>
      </div>

      {/* Hero Banner */}
      <Link href="/shop" className="block ">
        <div className="relative w-full aspect-video lg:aspect-[21/9] rounded-xl overflow-hidden bg-surface-container-low">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 lg:bottom-8 lg:left-8">
            <span className="label-upper text-white/80 block mb-1">HANDWOVEN ARCHIVE</span>
            <h2 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-white">
              Sambalpuri Baandha Silk
            </h2>
          </div>
        </div>
      </Link>

      {/* Collections */}
      <section className=" mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Collections</h2>
          <span className="label-upper">{categories.length} WEAVES</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="relative aspect-[4/5] rounded-xl overflow-hidden bg-surface-container-low group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3">
                <span className="font-sans text-title-sm text-white">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="mt-8 mb-8">
        <div className="flex items-center justify-between  mb-4">
          <h2 className="section-title">New Arrivals</h2>
          <Link href="/shop" className="font-sans text-label-md text-primary hover:underline">
            See all →
          </Link>
        </div>

        {/* Mobile: horizontal scroll / Desktop: grid */}
        <div className="flex lg:grid lg:grid-cols-4 gap-gutter overflow-x-auto  snap-x snap-mandatory scrollbar-none">
          {newArrivals.map((product) => {
            const price = product.startingPricePaise ?? 0;
            const compare = product.compareAtPaise ?? null;
            const lowStock = false; // List API doesn't return stock count
            return (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="flex-shrink-0 w-[160px] lg:w-auto snap-start group"
              >
                <div className="aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden mb-2 group-hover:shadow-md transition-shadow" />
                <p className="font-sans text-body-sm text-text-secondary truncate">{(product as any).fabric || 'Handloom'}</p>
                <p className="font-sans text-body-md text-text-primary font-medium truncate">{product.title}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-sans text-price-md text-accent">{formatPaise(price)}</span>
                  {compare && compare > price && (
                    <span className="font-sans text-body-sm text-text-tertiary line-through">{formatPaise(compare)}</span>
                  )}
                </div>
                {lowStock && (
                  <p className="font-sans text-body-sm text-accent mt-0.5">
                    {product.totalStock === 1 ? '1 piece left' : `Only ${product.totalStock} woven`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
