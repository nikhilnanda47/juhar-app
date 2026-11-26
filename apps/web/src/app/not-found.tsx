import Link from 'next/link';
import { Compass } from 'lucide-react';
import StatusPage from '@/components/StatusPage';

export const metadata = { title: 'Page not found — Juhar' };

// Shown for any address that does not exist on the site (a mistyped or old link)
export default function NotFound() {
  return (
    <StatusPage
      icon={<Compass size={36} strokeWidth={1.5} />}
      title="This page could not be found"
      actions={
        <>
          <Link href="/shop" className="btn-primary px-8">Continue shopping</Link>
          <Link href="/" className="btn-outline px-8">Back to home</Link>
        </>
      }
    >
      The link may be old or mistyped. You can look through our handwoven Sambalpuri sarees instead.
    </StatusPage>
  );
}
