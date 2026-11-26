'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CircleAlert } from 'lucide-react';
import StatusPage from '@/components/StatusPage';

// Shown when a page crashes while it is being drawn. The header and bottom bar stay; only this page is replaced.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <StatusPage
      icon={<CircleAlert size={36} strokeWidth={1.5} />}
      title="Something went wrong"
      actions={
        <>
          <button type="button" onClick={reset} className="btn-primary px-8">Try again</button>
          <Link href="/" className="btn-outline px-8">Back to home</Link>
        </>
      }
    >
      We could not show this page. Please try again in a moment.
      {error.digest ? <span className="block mt-2 font-sans text-label-sm text-text-tertiary">Reference: <span className="font-mono select-all">{error.digest}</span></span> : null}
    </StatusPage>
  );
}
