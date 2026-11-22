'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, Truck, MapPin, Phone, MessageCircle, ArrowRight, Copy, Package, ShieldCheck } from 'lucide-react';
import { loadToken, getOrder, formatPaise } from '@/lib/api';

const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  placed: 'Order Placed', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered',
};
const POST_DELIVERY_LABELS: Record<string, string> = {
  return_requested: 'Return requested', return_approved: 'Return approved', return_rejected: 'Return rejected',
  returned: 'Returned', refund_pending: 'Refund pending', refunded: 'Refunded',
};
const STEP_DESC: Record<string, string> = {
  placed: 'Your order has been received', confirmed: 'Artisan has confirmed your order',
  packed: 'Handpacked in kora cloth', shipped: 'On its way to you', delivered: 'Delivered to your doorstep',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken();
    getOrder(id)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-text-secondary">Order not found</p></div>;

  const isCancelled = order.status === 'cancelled';
  const postDeliveryLabel = POST_DELIVERY_LABELS[order.status];
  const currentIdx = postDeliveryLabel ? STEPS.length - 1 : STEPS.indexOf(order.status);
  const addr = order.addressSnapshot;

  return (
    <div className="page-container py-6 lg:py-10">
      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary">
            Order {order.publicNumber}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge bg-secondary-container/40 text-accent-dark">
              {order.paymentMode === 'cod' ? 'COD Order' : 'UPI Order'}
            </span>
            <span className="text-text-tertiary">·</span>
            <span className="font-sans text-body-sm text-text-tertiary">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        {/* WhatsApp — desktop inline */}
        <a href={`https://wa.me/919876543210?text=Order%20${order.publicNumber}`} target="_blank"
          className="hidden lg:flex items-center gap-2 mt-4 lg:mt-0 bg-surface rounded-xl border border-border px-5 py-3 hover:shadow-md transition-shadow">
          <div className="w-9 h-9 rounded-full bg-[rgba(37,211,102,0.1)] flex items-center justify-center">
            <MessageCircle size={20} className="text-whatsapp" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-sans text-body-md text-text-primary font-medium">Need help with this order?</p>
            <p className="font-sans text-body-sm text-text-tertiary">Chat on WhatsApp</p>
          </div>
          <ArrowRight size={16} className="text-primary ml-4" />
        </a>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Left column — main content */}
        <div>
          {/* Timeline — horizontal on desktop, vertical on mobile */}
          <h2 className="font-sans text-title-sm text-text-primary mb-4">Order Status</h2>

          {isCancelled && (
            <div className="card mb-6 !bg-status-cancelled-bg">
              <p className="font-sans text-title-sm text-status-cancelled-text">
                Order cancelled
                {order.cancelledAt && ` on ${new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
              {order.cancellationReason && (
                <p className="font-sans text-body-sm text-status-cancelled-text mt-1">{order.cancellationReason}</p>
              )}
            </div>
          )}

          {postDeliveryLabel && (
            <div className="card mb-4 !bg-surface-container-low flex items-center gap-2">
              <Package size={18} className="text-accent" strokeWidth={1.5} />
              <p className="font-sans text-title-sm text-text-primary">{postDeliveryLabel}</p>
            </div>
          )}

          {!isCancelled && (<>
          {/* Desktop: horizontal timeline */}
          <div className="hidden lg:block card mb-6">
            <div className="flex items-start justify-between">
              {STEPS.map((step, idx) => {
                const isDone = idx <= currentIdx;
                const isFuture = idx > currentIdx;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step} className="flex-1 flex flex-col items-center relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className={`absolute top-3 left-1/2 w-full h-0.5 ${isDone ? 'bg-success' : 'bg-surface-container'}`} />
                    )}
                    {/* Node */}
                    <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center ${isDone ? 'bg-success' : 'bg-surface-container'}`}>
                      {isDone && <Check size={14} className="text-white" strokeWidth={3} />}
                      {isFuture && <div className="w-2 h-2 rounded-full bg-outline/40" />}
                    </div>
                    <span className={`font-sans text-label-sm mt-2 text-center ${idx === currentIdx ? 'text-primary font-semibold' : isFuture ? 'text-text-tertiary' : 'text-text-secondary'}`}>
                      {STEP_LABELS[step]}
                    </span>
                    <span className="font-sans text-[11px] text-text-tertiary mt-0.5 text-center max-w-[100px]">
                      {STEP_DESC[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: vertical timeline */}
          <div className="lg:hidden card mb-6">
            {STEPS.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isFuture = idx > currentIdx;
              const isLast = idx === STEPS.length - 1;
              return (
                <div key={step} className="flex">
                  <div className="flex flex-col items-center mr-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isDone ? 'bg-success' : 'bg-surface-container'}`}>
                      {isDone && <Check size={13} className="text-white" strokeWidth={3} />}
                      {isFuture && <div className="w-2 h-2 rounded-full bg-outline/40" />}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 my-0.5 ${isDone ? 'bg-success' : 'bg-surface-container'}`} />}
                  </div>
                  <div className={`pb-4 ${isFuture ? 'opacity-50' : ''}`}>
                    <span className={`font-sans text-title-sm ${idx === currentIdx ? 'text-primary' : 'text-text-primary'}`}>
                      {STEP_LABELS[step]}
                    </span>
                    <p className="font-sans text-body-sm text-text-tertiary">{STEP_DESC[step]}</p>
                  </div>
                </div>
              );
            })}
          </div>
          </>)}

          {/* Tracking */}
          {order.shipments?.length > 0 && (
            <>
              <h2 className="font-sans text-title-sm text-text-primary mb-4">Tracking Information</h2>
              <div className="card mb-6">
                {order.shipments.map((s: any) => (
                  <div key={s.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                        <Truck size={20} className="text-accent" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-sans text-body-sm text-text-tertiary">Courier Partner</p>
                        <p className="font-sans text-title-sm text-text-primary">{s.carrier}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-surface-container-low rounded-xl p-3">
                      <div>
                        <p className="label-upper">TRACKING NO.</p>
                        <p className="font-sans text-title-sm text-text-primary tracking-wider mt-0.5">{s.trackingId}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard?.writeText(s.trackingId); }}
                        className="flex items-center gap-1 bg-surface px-3 py-2 rounded-lg shadow-sm hover:shadow transition-shadow">
                        <Copy size={14} className="text-primary" />
                        <span className="font-sans text-label-md text-primary">Copy</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Items */}
          <h2 className="font-sans text-title-sm text-text-primary mb-4">Items ({order.items?.length || 0})</h2>
          <div className="card mb-6">
            {order.items?.map((item: any, idx: number) => (
              <div key={item.id}>
                <div className="flex gap-4 py-3">
                  <div className="w-16 h-20 lg:w-20 lg:h-[106px] rounded-lg bg-surface-container-low shrink-0" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-sans text-body-md lg:text-title-sm text-text-primary font-medium">{item.productTitle}</p>
                      <p className="font-sans text-body-sm text-text-tertiary mt-0.5">{item.variantName || item.sku}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="font-sans text-body-sm text-text-secondary">Qty: {item.qty}</span>
                      <span className="font-sans text-price-md text-primary">{formatPaise(item.totalPaise)}</span>
                    </div>
                  </div>
                </div>
                {idx < order.items.length - 1 && <div className="h-px bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar — address + payment + support */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-6">
          {/* Address */}
          {addr && (
            <div>
              <h2 className="font-sans text-title-sm text-text-primary mb-4">Delivery Address</h2>
              <div className="card">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                    <MapPin size={20} className="text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-sans text-title-sm text-text-primary">{addr.recipientName}</p>
                      <span className="badge bg-surface-container text-text-tertiary text-[10px]">HOME</span>
                    </div>
                    <p className="font-sans text-body-md text-text-secondary mt-1 leading-relaxed">
                      {[addr.line1, addr.line2, addr.landmark].filter(Boolean).join(', ')}<br />
                      {addr.city}, {addr.state} — {addr.pinCode}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Phone size={14} className="text-text-tertiary" />
                      <span className="font-sans text-body-sm text-text-tertiary">{addr.recipientPhone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <h2 className="font-sans text-title-sm text-text-primary mb-4">Payment Summary</h2>
            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <span className="font-sans text-body-sm text-text-tertiary">Payment Method</span>
                <span className="badge bg-secondary-container/40 text-accent-dark">
                  {order.paymentMode === 'cod' ? 'Cash on Delivery' : 'UPI'}
                </span>
              </div>
              <div className="h-px bg-border my-3" />
              <div className="flex justify-between mb-2">
                <span className="font-sans text-body-md text-text-secondary">Subtotal ({order.items?.length || 0} items)</span>
                <span className="font-sans text-body-md text-text-primary">{formatPaise(order.subtotalPaise)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-sans text-body-md text-text-secondary">Shipping</span>
                <span className={`font-sans text-body-md ${order.shippingPaise === 0 ? 'text-success font-semibold uppercase text-label-sm tracking-wider' : 'text-text-primary'}`}>
                  {order.shippingPaise === 0 ? 'FREE' : formatPaise(order.shippingPaise)}
                </span>
              </div>
              <div className="h-px bg-border my-3" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-sans text-title-sm text-text-primary">Total to Pay</p>
                  <p className="font-sans text-body-sm text-text-tertiary mt-0.5">Pay cash or UPI on handover</p>
                </div>
                <span className="font-sans text-price-lg text-primary">{formatPaise(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Assurance */}
          <div className="card flex gap-3 !bg-surface-container-low">
            <ShieldCheck size={20} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="font-sans text-label-md text-text-primary font-medium">Authenticity Guaranteed</p>
              <p className="font-sans text-body-sm text-text-tertiary">GI certified with weaver provenance certificate</p>
            </div>
          </div>

          {/* WhatsApp — mobile only */}
          <div className="lg:hidden card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[rgba(37,211,102,0.1)] flex items-center justify-center">
                <MessageCircle size={24} className="text-whatsapp" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-sans text-body-md text-text-primary font-medium">Need help?</p>
                <p className="font-sans text-body-sm text-text-tertiary">Chat on WhatsApp</p>
              </div>
            </div>
            <a href={`https://wa.me/919876543210?text=Order%20${order.publicNumber}`} target="_blank"
              className="flex items-center gap-1 bg-surface-container-low px-3.5 py-2.5 rounded-lg">
              <span className="font-sans text-label-md text-primary font-semibold">Open</span>
              <ArrowRight size={14} className="text-primary" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
