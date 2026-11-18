'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ArrowRight, Package, Handshake } from 'lucide-react';
import { loadToken, getAddresses, getCart, formatPaise, type Address, type CartResponse } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function OrderReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addressId = searchParams.get('addressId');
  const [address, setAddress] = useState<Address | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!loadToken()) { router.push('/account'); return; }
    Promise.all([getAddresses(), getCart()]).then(([addrs, cartData]) => {
      setAddress(addrs.find(a => a.id === addressId) || null);
      setCart(cartData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [addressId]);

  const shippingPaise = (cart?.subtotalPaise ?? 0) >= 500000 ? 0 : 9900;
  const totalPaise = (cart?.subtotalPaise ?? 0) + shippingPaise;

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const token = localStorage.getItem('juhar_token');
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const res = await fetch(`${API_BASE}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ addressId, paymentMode: 'cod', idempotencyKey }),
      });
      const json = await res.json();
      if (json.success) router.push(`/order-success?orderId=${json.data.id}`);
      else alert(json.error?.message || 'Failed to place order');
    } catch (e: any) { alert(e.message || 'Failed'); }
    finally { setPlacing(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!cart || cart.items.length === 0) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-text-secondary">Your cart is empty</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-margin py-6">
      {/* Address */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-sans text-title-sm text-text-primary">Delivering to</h2>
        <span className="label-upper text-accent">VERIFIED ADDRESS</span>
      </div>
      {address && (
        <div className="card mb-6">
          <p className="font-sans text-title-sm text-text-primary">{address.recipientName}</p>
          <p className="font-sans text-body-md text-text-secondary mt-1">
            {[address.line1, address.line2, address.landmark, `${address.city}, ${address.pinCode}`].filter(Boolean).join(', ')}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <Phone size={14} className="text-text-tertiary" />
            <span className="font-sans text-body-sm text-text-secondary">{address.recipientPhone}</span>
          </div>
        </div>
      )}

      {/* Items */}
      <h2 className="font-sans text-title-sm text-text-primary mb-2">Items ({cart.itemCount})</h2>
      <div className="card mb-6">
        {cart.items.map((item, idx) => (
          <div key={item.id}>
            <div className="flex gap-3 py-2">
              <div className="w-[60px] h-20 rounded-lg bg-surface-container-low shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-sans text-title-sm text-text-primary truncate">{item.variant.productTitle}</p>
                  <span className="font-sans text-price-md text-accent">{formatPaise(item.lineTotalPaise)}</span>
                </div>
                <p className="font-sans text-body-sm text-text-secondary mt-0.5">
                  {[item.variant.color, `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            {idx < cart.items.length - 1 && <div className="h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Payment */}
      <h2 className="font-sans text-title-sm text-text-primary mb-2">Payment</h2>
      <div className="card mb-6">
        <div className="flex items-center gap-3 py-2">
          <div className="w-[18px] h-[18px] rounded-full bg-surface-container-high flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <div>
            <p className="font-sans text-title-sm text-text-primary">Cash on Delivery</p>
            <p className="font-sans text-body-sm text-text-secondary">Pay when you receive</p>
          </div>
        </div>
      </div>

      {/* Price */}
      <h2 className="font-sans text-title-sm text-text-primary mb-2">Price Details</h2>
      <div className="card mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-sans text-body-md text-text-secondary">Subtotal ({cart.itemCount} items)</span>
          <span className="font-sans text-body-md text-text-primary">{formatPaise(cart.subtotalPaise)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-sans text-body-md text-text-secondary">Shipping</span>
          <span className={`font-sans text-body-md ${shippingPaise === 0 ? 'text-accent font-semibold' : ''}`}>
            {shippingPaise === 0 ? 'FREE' : formatPaise(shippingPaise)}
          </span>
        </div>
        <div className="h-px bg-border my-3" />
        <div className="flex justify-between">
          <span className="font-sans text-title-sm">Total</span>
          <span className="font-sans text-price-lg text-text-primary">{formatPaise(totalPaise)}</span>
        </div>
      </div>

      {/* Delivery estimate */}
      <div className="card flex items-center gap-2 mb-4 !bg-surface-container-low">
        <Package size={16} className="text-text-secondary" />
        <span className="font-sans text-body-md text-text-secondary">Estimated delivery <strong className="text-text-primary">22–26 Nov 2026</strong></span>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-6">
        <Handshake size={14} className="text-accent" />
        <span className="font-sans text-label-sm text-text-secondary">Direct fair-trade remuneration guaranteed to weavers</span>
      </div>

      {/* Place Order */}
      <button onClick={handlePlaceOrder} disabled={placing} className="btn-primary w-full disabled:opacity-50">
        {placing ? 'Securing Order...' : `Place Order (${formatPaise(totalPaise)})`}
      </button>
    </div>
  );
}
