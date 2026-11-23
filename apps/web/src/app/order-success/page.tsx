'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import { loadToken, getOrder, formatPaise } from '@/lib/api';

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    loadToken();
    getOrder(orderId)
      .then(setOrder)
      .catch(() => {});
  }, [orderId]);

  if (!order) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const firstItem = order.items?.[0];

  return (
    <div className="max-w-md mx-auto px-margin py-10 flex flex-col items-center text-center">
      {/* Checkmark */}
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-bounce-in">
        <Check size={32} className="text-success" strokeWidth={2.5} />
      </div>

      <h1 className="font-serif text-headline-lg-mobile text-text-primary mb-1">Order placed!</h1>
      <p className="font-sans text-body-md text-text-secondary mb-4">
        Thank you for championing indigenous handloom craft.
      </p>

      {/* Ref */}
      <div className="inline-flex items-center gap-1.5 bg-surface-container px-3.5 py-1.5 rounded-full mb-6">
        <span className="label-upper">REF:</span>
        <span className="font-sans text-title-sm text-primary">{order.publicNumber}</span>
      </div>

      {/* Preview */}
      <div className="card w-full text-left mb-4">
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-[72px] rounded-lg bg-surface-container-low shrink-0" />
          <div>
            <span className="label-upper text-accent">MASTERPIECE RESERVED</span>
            <p className="font-sans text-body-md text-text-primary font-medium mt-0.5">{firstItem?.productTitle || 'Handloom Saree'}</p>
            <p className="font-sans text-body-sm text-text-secondary">{firstItem?.variantName || 'Sambalpuri Cluster'}</p>
          </div>
        </div>
        <div className="h-px bg-border mb-3" />
        <div className="flex justify-between items-start">
          <div>
            <p className="font-sans text-body-sm text-text-secondary">Estimated delivery</p>
            <p className="font-sans text-title-sm text-text-primary">22–26 Nov 2026</p>
          </div>
          <Truck size={20} className="text-accent" strokeWidth={1.5} />
        </div>
      </div>

      {/* Assurance */}
      <div className="card w-full flex gap-3 text-left mb-6 !bg-surface-container-low">
        <ShieldCheck size={20} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="font-sans text-label-md text-text-primary font-medium">Sacred Care & Authenticity</p>
          <p className="font-sans text-body-sm text-text-secondary">Handpacked in unbleached kora cloth with GI weaver provenance certificate.</p>
        </div>
      </div>

      {/* Actions */}
      <button onClick={() => router.push(`/orders/${order.id}`)} className="btn-primary w-full mb-3">View Order</button>
      <button onClick={() => router.push('/')} className="flex items-center justify-center gap-1 w-full py-2.5 font-sans text-body-md text-primary font-semibold">
        Continue Shopping <ArrowRight size={18} />
      </button>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
