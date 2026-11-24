'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Check, MapPin, ShieldCheck, Home, Briefcase, MoreHorizontal } from 'lucide-react';
import { createAddress, referenceOf } from '@/lib/api';
import ErrorReference from '@/components/ErrorReference';

const LABEL_OPTIONS = [
  { value: 'Home', icon: Home, desc: 'House / Apartment' },
  { value: 'Office', icon: Briefcase, desc: 'Workplace' },
  { value: 'Other', icon: MoreHorizontal, desc: 'Custom label' },
];

export default function AddAddressPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    recipientName: '', recipientPhone: '', line1: '', line2: '', landmark: '',
    city: '', district: '', state: 'Odisha', pinCode: '', label: 'Home', isDefault: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState(''); // the API's reference for the failed request

  const update = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const problems: string[] = [];
  if (form.recipientName.length < 2) problems.push('full name');
  if (form.recipientPhone.length !== 10) problems.push('10-digit phone number');
  else if (!/^[6-9]/.test(form.recipientPhone)) problems.push('phone number starting with 6, 7, 8 or 9');
  if (form.line1.length < 5) problems.push('address line 1 (at least 5 characters)');
  if (form.city.length < 2) problems.push('city');
  if (form.district.length < 2) problems.push('district');
  if (!/^[1-9]\d{5}$/.test(form.pinCode)) problems.push('6-digit PIN code (cannot start with 0)');
  const isValid = problems.length === 0;

  const started = ['recipientName', 'recipientPhone', 'line1', 'city', 'district', 'pinCode']
    .some((k) => form[k as keyof typeof form]);
  const hint = started && !isValid
    ? <p className="font-sans text-body-sm text-text-secondary mb-3">Still needed to save: {problems.join(', ')}.</p>
    : null;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true); setError(''); setErrorRef('');
    try {
      await createAddress({ ...form, recipientPhone: '+91' + form.recipientPhone } as any);
      router.back();
    } catch (e: any) { setError(e.message || 'Failed to save'); setErrorRef(referenceOf(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container py-6 lg:py-10">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary">Add New Address</h1>
        <p className="font-sans text-body-md text-text-secondary mt-1">Enter delivery details for your handloom order</p>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
        {/* Left — Form */}
        <div>
          {/* Reassurance banner */}
          <div className="card flex items-center gap-3 mb-6 !bg-surface-container-low/50">
            <Truck size={18} className="text-accent shrink-0" strokeWidth={1.5} />
            <span className="font-sans text-body-sm text-text-secondary">Handcrafted weaves are shipped with insured, climate-safe packaging.</span>
          </div>

          {/* Contact section */}
          <div className="mb-8">
            <h2 className="font-sans text-title-sm text-text-primary mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-sans text-label-sm">1</div>
              Contact Details
            </h2>
            <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
              <Field label="FULL NAME" value={form.recipientName} onChange={(v) => update('recipientName', v)} placeholder="e.g. Priya Mohanty" />
              <div>
                <div className="flex justify-between mb-2">
                  <label className="label-upper">PHONE NUMBER</label>
                </div>
                <div className="flex">
                  <div className="h-12 lg:h-[52px] px-4 bg-surface-container-low rounded-l-xl border border-r-0 border-border flex items-center">
                    <span className="font-sans text-body-md text-text-secondary font-medium">+91</span>
                  </div>
                  <input type="tel" value={form.recipientPhone} onChange={(e) => update('recipientPhone', e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210" maxLength={10}
                    className="flex-1 h-12 lg:h-[52px] bg-surface rounded-r-xl border border-border px-4 font-sans text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Address section */}
          <div className="mb-8">
            <h2 className="font-sans text-title-sm text-text-primary mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-sans text-label-sm">2</div>
              Address Details
            </h2>
            <div className="space-y-4">
              <Field label="ADDRESS LINE 1" value={form.line1} onChange={(v) => update('line1', v)} placeholder="House / Flat No., Street name" />

              <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
                <Field label="ADDRESS LINE 2" value={form.line2} onChange={(v) => update('line2', v)} placeholder="Near Shanti Temple" optional />
                <Field label="LANDMARK" value={form.landmark} onChange={(v) => update('landmark', v)} placeholder="Opposite Government Girls High School" optional />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <Field label="CITY" value={form.city} onChange={(v) => update('city', v)} placeholder="Sambalpur" />
                <Field label="DISTRICT" value={form.district} onChange={(v) => update('district', v)} placeholder="Sambalpur" />
                <Field label="STATE" value={form.state} onChange={(v) => update('state', v)} placeholder="Odisha" />
                <Field label="PIN CODE" value={form.pinCode} onChange={(v) => update('pinCode', v.replace(/\D/g, ''))} placeholder="768001" maxLength={6} />
              </div>
            </div>
          </div>

          {/* Preferences section */}
          <div className="mb-8">
            <h2 className="font-sans text-title-sm text-text-primary mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-sans text-label-sm">3</div>
              Preferences
            </h2>

            {/* Label cards */}
            <div className="mb-5">
              <label className="label-upper block mb-3">SAVE ADDRESS AS</label>
              <div className="grid grid-cols-3 gap-3">
                {LABEL_OPTIONS.map(({ value, icon: Icon, desc }) => (
                  <button key={value} onClick={() => update('label', value)}
                    className={`p-3 lg:p-4 rounded-xl border-2 flex flex-col items-center text-center transition-all hover:shadow-sm ${
                      form.label === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface'
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      form.label === value ? 'bg-primary/10' : 'bg-surface-container-low'
                    }`}>
                      <Icon size={20} className={form.label === value ? 'text-primary' : 'text-text-tertiary'} strokeWidth={1.5} />
                    </div>
                    <span className={`font-sans text-label-md font-medium ${form.label === value ? 'text-primary' : 'text-text-primary'}`}>{value}</span>
                    <span className="font-sans text-[11px] text-text-tertiary mt-0.5 hidden lg:block">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Default toggle */}
            <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-low/50 transition-colors w-full" onClick={() => update('isDefault', !form.isDefault)}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${form.isDefault ? 'bg-primary' : 'bg-surface border-2 border-border'}`}>
                {form.isDefault && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="text-left">
                <span className="font-sans text-body-md text-text-primary block">Set as default delivery address</span>
                <span className="font-sans text-body-sm text-text-tertiary">This address will be pre-selected at checkout</span>
              </div>
            </button>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden">
            {hint}
            {error && <p className="font-sans text-body-sm text-error mb-1">{error}</p>}
            <ErrorReference id={errorRef} className="mb-3" />
            <button onClick={handleSave} disabled={!isValid || saving}
              className="btn-primary w-full !h-14 !rounded-xl !text-title-sm disabled:opacity-40">
              {saving ? 'Saving...' : 'Save Address'} <Check size={18} />
            </button>
          </div>
        </div>

        {/* Right sidebar — Preview + CTA (desktop) */}
        <div className="hidden lg:block sticky top-20 self-start space-y-4">
          {/* Live preview */}
          <div className="card">
            <p className="label-upper mb-3">ADDRESS PREVIEW</p>
            {form.recipientName ? (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-sans text-title-sm text-text-primary">{form.recipientName || '—'}</p>
                  {form.line1 && <p className="font-sans text-body-md text-text-secondary mt-1">{form.line1}</p>}
                  {form.line2 && <p className="font-sans text-body-sm text-text-secondary">{form.line2}</p>}
                  {(form.city || form.pinCode) && (
                    <p className="font-sans text-body-sm text-text-secondary">
                      {[form.city, form.state, form.pinCode].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {form.recipientPhone && (
                    <p className="font-sans text-body-sm text-text-tertiary mt-2">+91 {form.recipientPhone}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="badge bg-surface-container text-text-tertiary text-[10px]">{form.label}</span>
                    {form.isDefault && <span className="badge bg-success/10 text-success text-[10px]">Default</span>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <MapPin size={28} className="text-text-tertiary/40 mb-2" strokeWidth={1.5} />
                <p className="font-sans text-body-sm text-text-tertiary">Start typing to see preview</p>
              </div>
            )}
          </div>

          {/* Security */}
          <div className="card flex gap-3 !bg-surface-container-low/50">
            <ShieldCheck size={18} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-sans text-label-md text-text-primary font-medium">Secure Storage</p>
              <p className="font-sans text-body-sm text-text-tertiary">Address encrypted and never shared with third parties.</p>
            </div>
          </div>

          {/* CTA */}
          {hint}
          {error && <p className="font-sans text-body-sm text-error">{error}</p>}
          <ErrorReference id={errorRef} />
          <button onClick={handleSave} disabled={!isValid || saving}
            className="btn-primary w-full !h-14 !rounded-xl !text-title-sm disabled:opacity-40">
            {saving ? 'Saving...' : 'Save Address'} <Check size={18} />
          </button>

          {/* Progress hint */}
          <div className="flex items-center justify-center gap-4 text-text-tertiary">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-sans text-[11px]">Address</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-border" />
              <span className="font-sans text-[11px]">Review</span>
            </div>
            <div className="w-8 h-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-border" />
              <span className="font-sans text-[11px]">Order</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, optional, maxLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; optional?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="label-upper">{label}</label>
        {optional && <span className="label-upper opacity-60">Optional</span>}
      </div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}
        className="w-full h-12 lg:h-[52px] bg-surface rounded-xl border border-border px-4 font-sans text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all" />
    </div>
  );
}
