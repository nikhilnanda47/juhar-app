'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, ChevronRight, ShieldCheck, Phone, Pencil, Truck, Leaf, Home, Briefcase } from 'lucide-react';
import { loadToken, getAddresses, type Address } from '@/lib/api';

const LABEL_ICONS: Record<string, typeof Home> = { Home, Office: Briefcase };

export default function SelectAddressPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadToken()) { router.push('/account'); return; }
    getAddresses().then((a) => {
      setAddresses(a);
      const def = a.find(addr => addr.isDefault);
      setSelected(def?.id || a[0]?.id || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const selectedAddr = addresses.find(a => a.id === selected);

  return (
    <div className="page-container py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary">Delivery Address</h1>
          <p className="font-sans text-body-md text-text-secondary mt-1">Choose where to deliver your handloom sarees</p>
        </div>
        <div className="flex items-center gap-2 mt-3 lg:mt-0">
          <span className="badge bg-surface-container text-text-secondary">{addresses.length} saved</span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Left — Address list */}
        <div>
          {addresses.length === 0 && (
            <div className="card flex flex-col items-center py-12 text-center mb-4">
              <MapPin size={40} className="text-text-tertiary mb-3" strokeWidth={1.5} />
              <p className="font-sans text-title-sm text-text-primary mb-1">No saved addresses</p>
              <p className="font-sans text-body-md text-text-secondary mb-4">Add an address to get started</p>
            </div>
          )}

          {/* Desktop: grid, Mobile: stack */}
          <div className="grid gap-3 lg:grid-cols-2">
            {addresses.map((addr) => {
              const isSelected = selected === addr.id;
              const LabelIcon = LABEL_ICONS[addr.label] || MapPin;
              return (
                <button
                  key={addr.id}
                  onClick={() => setSelected(addr.id)}
                  className={`card w-full text-left transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary !border-primary/30' : ''
                  }`}
                >
                  {/* Top row: radio + label + badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-primary' : 'border-border'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <LabelIcon size={14} className="text-text-tertiary" strokeWidth={1.5} />
                        <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider">{addr.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success font-sans text-[10px] font-semibold uppercase tracking-wider">Default</span>
                      )}
                      <button className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
                        onClick={(e) => { e.stopPropagation(); }}>
                        <Pencil size={12} className="text-text-tertiary" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Name */}
                  <p className="font-sans text-title-sm text-text-primary">{addr.recipientName}</p>

                  {/* Address */}
                  <p className="font-sans text-body-md text-text-secondary mt-1 leading-relaxed">
                    {[addr.line1, addr.line2, addr.landmark].filter(Boolean).join(', ')}
                  </p>
                  <p className="font-sans text-body-md text-text-secondary">
                    {addr.city}, {addr.state} — {addr.pinCode}
                  </p>

                  {/* Phone */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <Phone size={13} className="text-text-tertiary" strokeWidth={1.5} />
                    <span className="font-sans text-body-sm text-text-tertiary">{addr.recipientPhone}</span>
                  </div>

                  {/* Delivery estimate */}
                  {isSelected && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <Leaf size={14} className="text-accent" strokeWidth={1.5} />
                      <span className="font-sans text-body-sm text-accent font-medium">Estimated delivery in 5–7 days</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add new */}
          <button
            onClick={() => router.push('/checkout/address/new')}
            className="w-full mt-4 h-14 rounded-xl border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center gap-2 font-sans text-body-md text-text-secondary hover:text-primary transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-surface-container-low group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus size={18} className="text-text-tertiary group-hover:text-primary" strokeWidth={1.5} />
            </div>
            Add New Address
          </button>
        </div>

        {/* Right sidebar — Summary + CTA */}
        <div className="mt-6 lg:mt-0 lg:sticky lg:top-20 lg:self-start space-y-4">
          {/* Selected address summary */}
          {selectedAddr && (
            <div className="card">
              <p className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider mb-3">DELIVERING TO</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-sans text-title-sm text-text-primary">{selectedAddr.recipientName}</p>
                  <p className="font-sans text-body-sm text-text-secondary mt-0.5">
                    {selectedAddr.line1}, {selectedAddr.city} — {selectedAddr.pinCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-surface-container-low/50">
                <Truck size={16} className="text-accent" strokeWidth={1.5} />
                <span className="font-sans text-body-sm text-accent font-medium">Free shipping on orders above ₹5,000</span>
              </div>
            </div>
          )}

          {/* Security note */}
          <div className="card flex gap-3 !bg-surface-container-low/50">
            <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-sans text-label-md text-text-primary font-medium">Secure & Private</p>
              <p className="font-sans text-body-sm text-text-tertiary">Your address is securely stored and never shared with third parties.</p>
            </div>
          </div>

          {/* CTA */}
          {selected && (
            <button
              onClick={() => router.push(`/checkout/review?addressId=${selected}`)}
              className="btn-primary w-full !h-14 !rounded-xl !text-title-sm"
            >
              Deliver Here <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
