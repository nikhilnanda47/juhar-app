'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { loadToken, getAddresses, referenceOf, type Address } from '@/lib/api';
import AddressForm from '@/components/AddressForm';
import ErrorReference from '@/components/ErrorReference';

export default function EditAddressPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [address, setAddress] = useState<Address | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  const [errorRef, setErrorRef] = useState('');

  useEffect(() => {
    if (!loadToken()) { router.push('/account'); return; }
    getAddresses()
      .then((all) => {
        const found = all.find((a) => a.id === id) || null;
        setAddress(found);
        setState(found ? 'ready' : 'missing'); // deleted elsewhere, or not this customer's
      })
      .catch((e) => { setErrorRef(referenceOf(e)); setState('failed'); });
  }, [id, router]);

  if (state === 'loading') {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (state !== 'ready' || !address) {
    return (
      <div className="page-container py-12 text-center">
        <p className="font-sans text-title-sm text-text-primary mb-2">
          {state === 'missing' ? 'This address is no longer saved.' : 'Could not load this address. Please try again.'}
        </p>
        <ErrorReference id={errorRef} className="mb-3" />
        <Link href="/account/addresses" className="font-sans text-body-md text-primary hover:underline">Back to my addresses</Link>
      </div>
    );
  }
  return <AddressForm address={address} />;
}
