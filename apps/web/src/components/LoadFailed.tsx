'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CircleAlert, WifiOff } from 'lucide-react';
import StatusPage from '@/components/StatusPage';
import ErrorReference from '@/components/ErrorReference';
import type { LoadFailure } from '@/lib/load-failure';

/**
 * Shown in place of a page's content when it could not be loaded: "You're offline" with a Try again button when the
 * browser could not reach the server, or a short "Something went wrong" (with the API's reference) otherwise.
 */
export default function LoadFailed({ failure, onRetry }: { failure: LoadFailure; onRetry: () => void | Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  const offline = failure.kind === 'offline';

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await onRetry(); } finally { setRetrying(false); }
  };

  return (
    <StatusPage
      icon={offline ? <WifiOff size={36} strokeWidth={1.5} /> : <CircleAlert size={36} strokeWidth={1.5} />}
      title={offline ? "You're offline" : 'Something went wrong'}
      actions={
        <>
          <button type="button" onClick={retry} disabled={retrying} className="btn-primary px-8 disabled:opacity-70">
            {retrying ? 'Trying...' : 'Try again'}
          </button>
          <Link href="/" className="btn-outline px-8">Back to home</Link>
        </>
      }
    >
      {offline ? 'We could not reach Juhar. Check your internet connection and try again.' : failure.message}
      <ErrorReference id={failure.reference} className="justify-center mt-2" />
    </StatusPage>
  );
}
