'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, User } from 'lucide-react';
import { useCartCount } from '@/lib/cart-context';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/orders', label: 'Orders' },
];

export default function Header() {
  const pathname = usePathname();
  const { itemCount } = useCartCount();

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="w-full h-16 px-4 md:px-6 lg:px-10 xl:px-16 flex items-center justify-between">
        {/* Brand — hidden on mobile (sub-header handles it) */}
        <Link href="/" className="hidden lg:flex items-center gap-space-xs">
          <span className="font-serif text-headline-md text-primary">Juhar</span>
          <span className="font-sans text-body-md text-on-surface-variant/80">ଜୁହାର୍</span>
        </Link>
        <div className="lg:hidden" />

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-sans text-body-md transition-colors hover:text-primary ${
                pathname === link.href ? 'text-primary font-semibold' : 'text-text-secondary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions — desktop only (mobile uses bottom nav) */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/shop"
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <Link
            href="/cart"
            className="relative w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-primary text-white font-sans text-[10px] font-bold flex items-center justify-center px-1">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            <User size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}
