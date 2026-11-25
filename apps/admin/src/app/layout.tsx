import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Juhar Admin',
  description: 'Juhar e-commerce admin panel',
};

// Shows the saved light/dark choice before the first paint, so a dark page never flashes white
const themeScript = `try{if(localStorage.getItem('juhar_admin_theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
