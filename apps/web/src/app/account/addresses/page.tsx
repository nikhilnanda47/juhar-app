'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Phone, Pencil, Trash2, Home, Briefcase, ArrowLeft } from 'lucide-react';
import { loadToken, getAddresses, updateAddress, deleteAddress, referenceOf, type Address, messageOf } from '@/lib/api';
import ErrorReference from '@/components/ErrorReference';

const LABEL_ICONS: Record<string, typeof Home> = { Home, Office: Briefcase };
const MAX_ADDRESSES = 10; // the same limit the API enforces

export default function MyAddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState('');

  const reload = async () => {
    try { setAddresses(await getAddresses()); }
    catch (e) { setError(messageOf(e, 'Could not load your addresses. Please try again.')); setErrorRef(referenceOf(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loadToken()) { router.push('/account'); return; }
    reload();
    // coming back from the edit or add page: read the list again
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (id: string, work: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id); setError(''); setErrorRef('');
    try { await work(); await reload(); }
    catch (e) { setError(messageOf(e, 'Something went wrong. Please try again.')); setErrorRef(referenceOf(e)); }
    finally { setBusyId(null); }
  };

  const makeDefault = (a: Address) => run(a.id, () => updateAddress(a.id, { isDefault: true }));
  const remove = (a: Address) => {
    const what = [a.recipientName, a.line1].filter(Boolean).join(', ');
    if (!window.confirm(`Delete this address?\n\n${what}`)) return;
    run(a.id, () => deleteAddress(a.id));
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const full = addresses.length >= MAX_ADDRESSES;

  return (
    <div className="page-container py-6 lg:py-10">
      <Link href="/account" className="inline-flex items-center gap-1.5 font-sans text-body-sm text-text-secondary hover:text-primary mb-4">
        <ArrowLeft size={16} strokeWidth={1.5} /> Account
      </Link>
      <div className="mb-6 lg:mb-8">
        <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary">My Addresses</h1>
        <p className="font-sans text-body-md text-text-secondary mt-1">
          {addresses.length} saved. Your default address is pre-selected at checkout.
        </p>
      </div>

      {error && <p className="font-sans text-body-sm text-error mb-1" role="alert">{error}</p>}
      <ErrorReference id={errorRef} className="mb-3" />

      {addresses.length === 0 && (
        <div className="card flex flex-col items-center py-12 text-center mb-4">
          <MapPin size={40} className="text-text-tertiary mb-3" strokeWidth={1.5} />
          <p className="font-sans text-title-sm text-text-primary mb-1">No saved addresses</p>
          <p className="font-sans text-body-md text-text-secondary">Add one now so checkout is quicker next time.</p>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {addresses.map((a) => {
          const LabelIcon = LABEL_ICONS[a.label] || MapPin;
          const busy = busyId === a.id;
          return (
            <div key={a.id} className={`card ${busy ? 'opacity-60' : ''}`} data-testid="address-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <LabelIcon size={14} className="text-text-tertiary" strokeWidth={1.5} />
                  <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider">{a.label}</span>
                </div>
                {a.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-success/10 text-success font-sans text-[10px] font-semibold uppercase tracking-wider">Default</span>
                )}
              </div>
              <p className="font-sans text-title-sm text-text-primary">{a.recipientName}</p>
              <p className="font-sans text-body-md text-text-secondary mt-1 leading-relaxed">
                {[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}
              </p>
              <p className="font-sans text-body-md text-text-secondary">{a.city}, {a.state} — {a.pinCode}</p>
              <div className="flex items-center gap-1.5 mt-2.5">
                <Phone size={13} className="text-text-tertiary" strokeWidth={1.5} />
                <span className="font-sans text-body-sm text-text-tertiary">{a.recipientPhone}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => router.push(`/account/addresses/${a.id}`)}
                  disabled={busy}
                  className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container font-sans text-label-md text-text-primary flex items-center gap-1.5 transition-colors"
                  aria-label={`Edit address for ${a.recipientName}`}
                >
                  <Pencil size={14} strokeWidth={1.5} /> Edit
                </button>
                {!a.isDefault && (
                  <button
                    onClick={() => makeDefault(a)}
                    disabled={busy}
                    className="h-9 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container font-sans text-label-md text-text-primary transition-colors"
                  >
                    Make default
                  </button>
                )}
                <button
                  onClick={() => remove(a)}
                  disabled={busy}
                  className="h-9 px-3 rounded-lg font-sans text-label-md text-error hover:bg-error/10 flex items-center gap-1.5 transition-colors ml-auto"
                  aria-label={`Delete address for ${a.recipientName}`}
                >
                  <Trash2 size={14} strokeWidth={1.5} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => router.push('/checkout/address/new')}
        disabled={full}
        className="w-full mt-4 h-14 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center gap-2 font-sans text-body-md text-text-secondary hover:text-primary transition-all disabled:opacity-50 disabled:hover:border-border disabled:hover:text-text-secondary"
      >
        <Plus size={18} strokeWidth={1.5} /> {full ? `You can keep up to ${MAX_ADDRESSES} addresses. Delete one to add another.` : 'Add New Address'}
      </button>
    </div>
  );
}
