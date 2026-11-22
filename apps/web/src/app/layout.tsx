import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { CartProvider } from '@/lib/cart-context';
import { ThemeProvider } from '@/lib/theme-context';

const notoSerif = localFont({
  src: [
    { path: '../fonts/NotoSerif-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/NotoSerif-Medium.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = localFont({
  src: [
    { path: '../fonts/DMSans-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/DMSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/DMSans-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../fonts/DMSans-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Juhar — Sambalpuri Handloom Sarees | Direct from Weavers',
  description: 'Authentic Sambalpuri handloom sarees from Western Odisha. Direct from master weavers to your doorstep. GI certified, fair-trade, cash on delivery.',
  keywords: ['sambalpuri saree', 'handloom', 'odisha', 'ikat', 'bandha', 'handwoven'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FAFAF7',
};

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('juhar_theme');
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <CartProvider>
            <Header />
            <main className="flex-1 pb-20 lg:pb-0">
              {children}
            </main>
            <BottomNav />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
