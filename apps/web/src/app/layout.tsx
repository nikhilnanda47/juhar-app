import type { Metadata, Viewport } from 'next';
import { Noto_Serif, DM_Sans } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { CartProvider } from '@/lib/cart-context';

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Sajani — Sambalpuri Handloom Sarees | Direct from Weavers',
  description: 'Authentic Sambalpuri handloom sarees from Western Odisha. Direct from master weavers to your doorstep. GI certified, fair-trade, cash on delivery.',
  keywords: ['sambalpuri saree', 'handloom', 'odisha', 'ikat', 'bandha', 'handwoven'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAFAF7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Header />
          <main className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
