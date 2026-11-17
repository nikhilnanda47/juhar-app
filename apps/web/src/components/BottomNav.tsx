'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, Package, User } from 'lucide-react';
import { useCartCount } from '@/lib/cart-context';

const TABS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/shop', label: 'Shop', Icon: Search },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
  { href: '/orders', label: 'Orders', Icon: Package },
  { href: '/account', label: 'Account', Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCartCount();

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] lg:hidden">
      <div className="flex justify-around items-center h-16 px-space-xs max-w-mobile mx-auto">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          const showBadge = label === 'Cart' && itemCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-space-xs min-w-[56px] h-11 transition-colors relative ${
                active ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white font-sans text-[10px] font-bold flex items-center justify-center px-1">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </div>
              <span className="font-sans text-label-sm">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
