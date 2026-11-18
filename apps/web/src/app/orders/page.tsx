'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, User, ArrowRight, ShieldCheck, Truck, Filter } from 'lucide-react';
import { loadToken, formatPaise } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  placed: { bg: '#E8E8E5', text: '#8B3A4A', label: 'Placed' },
  confirmed: { bg: '#FFF8E1', text: '#F57F17', label: 'Confirmed' },
  packed: { bg: '#FFF3E0', text: '#E65100', label: 'Packed' },
  shipped: { bg: '#FFF3E0', text: '#E65100', label: 'Shipped' },
  delivered: { bg: 'rgba(255,218,171,0.4)', text: '#795E38', label: 'Delivered' },
  cancelled: { bg: '#FCE4EC', text: '#C62828', label: 'Cancelled' },
};

const FILTERS = ['All', 'Placed', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const hasToken = loadToken();
    setLoggedIn(hasToken);
    if (hasToken) {
      const token = localStorage.getItem('juhar_token');
      fetch(`${API_BASE}/api/v1/orders`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(j => setOrders(j.success ? j.data.items : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const filteredOrders = activeFilter === 'All'
    ? orders
    : orders.filter((o: any) => o.status === activeFilter.toLowerCase());

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!loggedIn) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <User size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
      <h2 className="section-title mb-4">Log in to view orders</h2>
      <button onClick={() => router.push('/account')} className="btn-primary px-8">Log In</button>
    </div>
  );

  if (orders.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <Package size={48} className="text-text-tertiary mb-4" strokeWidth={1.5} />
      <h2 className="section-title mb-2">No orders yet</h2>
      <p className="font-sans text-body-md text-text-secondary mb-6">Your handloom orders will appear here.</p>
      <button onClick={() => router.push('/shop')} className="btn-outline px-8">Start Shopping</button>
    </div>
  );

  return (
    <div className="page-container py-6 lg:py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-text-primary">My Orders</h1>
          <p className="font-sans text-body-md text-text-secondary mt-1 hidden lg:block">Track and manage your handloom purchases</p>
        </div>
        {/* Stats — desktop */}
        <div className="hidden lg:flex items-center gap-6 mt-4 lg:mt-0">
          <div className="flex items-center gap-2 text-text-secondary">
            <Package size={18} className="text-accent" strokeWidth={1.5} />
            <span className="font-sans text-body-md"><strong className="text-text-primary">{orders.length}</strong> orders</span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <ShieldCheck size={18} className="text-accent" strokeWidth={1.5} />
            <span className="font-sans text-body-md">Artisan Certified</span>
          </div>
        </div>
      </div>

      {/* Summary banner — mobile */}
      <div className="lg:hidden card flex items-center justify-between mb-4 !bg-surface-container-low">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-accent" strokeWidth={2} />
          <span className="font-sans text-body-sm text-text-secondary font-medium">{orders.length} Handcrafted Orders</span>
        </div>
        <span className="label-upper text-accent">ARTISAN CERTIFIED</span>
      </div>

      {/* Filter chips — desktop */}
      <div className="hidden lg:flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full font-sans text-label-md transition-all ${
              activeFilter === f
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface text-text-secondary border border-border hover:bg-surface-container-low'
            }`}
          >
            {f}
            {f !== 'All' && (
              <span className="ml-1.5 opacity-70">
                {orders.filter((o: any) => o.status === f.toLowerCase()).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: table-like layout */}
      <div className="hidden lg:block">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_200px_120px_140px_100px] gap-4 px-5 py-3 bg-surface-container-low rounded-t-xl">
          <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider">Order</span>
          <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider">Items</span>
          <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider">Status</span>
          <span className="font-sans text-label-sm text-text-tertiary uppercase tracking-wider text-right">Total</span>
          <span />
        </div>

        {/* Table rows */}
        <div className="border border-border rounded-b-xl overflow-hidden divide-y divide-border">
          {filteredOrders.map((order: any) => {
            const sc = STATUS_STYLES[order.status] || STATUS_STYLES.placed;
            const firstItem = order.items?.[0];
            const moreCount = (order.itemCount || order.items?.length || 0) - 1;
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="grid grid-cols-[1fr_200px_120px_140px_100px] gap-4 px-5 py-4 items-center bg-surface hover:bg-surface-container-low/30 transition-colors group"
              >
                {/* Order info */}
                <div>
                  <p className="font-sans text-title-sm text-text-primary">{order.publicNumber}</p>
                  <p className="font-sans text-body-sm text-text-tertiary mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Items preview */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-14 rounded-lg bg-surface-container-low shrink-0" />
                  <div className="min-w-0">
                    <p className="font-sans text-body-sm text-text-primary truncate">{firstItem?.productTitle || 'Handloom Saree'}</p>
                    {moreCount > 0 && <p className="font-sans text-label-sm text-primary">+{moreCount} more</p>}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span className="badge" style={{ backgroundColor: sc.bg, color: sc.text }}>
                    {sc.label}
                  </span>
                </div>

                {/* Total */}
                <p className="font-sans text-title-sm text-text-primary text-right">{formatPaise(order.totalPaise)}</p>

                {/* Arrow */}
                <div className="flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary group-hover:text-white text-text-tertiary transition-all">
                    <ArrowRight size={16} strokeWidth={2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Package size={40} className="text-text-tertiary mb-3" strokeWidth={1.5} />
            <p className="font-sans text-body-md text-text-secondary">No {activeFilter.toLowerCase()} orders</p>
          </div>
        )}
      </div>

      {/* Mobile/Tablet: card layout */}
      <div className="lg:hidden grid gap-3 md:grid-cols-2">
        {orders.map((order: any) => {
          const sc = STATUS_STYLES[order.status] || STATUS_STYLES.placed;
          const firstItem = order.items?.[0];
          const moreCount = (order.itemCount || order.items?.length || 0) - 1;
          return (
            <Link key={order.id} href={`/orders/${order.id}`} className="card group hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-sans text-title-sm text-text-primary">{order.publicNumber}</p>
                  <p className="font-sans text-body-sm text-text-secondary mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="badge" style={{ backgroundColor: sc.bg, color: sc.text }}>
                  {sc.label}
                </span>
              </div>
              <div className="flex items-center gap-3 bg-surface-container-low/50 p-1.5 rounded-lg mt-3">
                <div className="w-12 h-16 rounded-lg bg-surface-container-high shrink-0" />
                <div className="min-w-0">
                  <p className="font-sans text-body-md text-text-primary font-medium truncate">{firstItem?.productTitle || 'Handloom Saree'}</p>
                  {moreCount > 0 && <p className="font-sans text-label-sm text-primary mt-0.5">+{moreCount} more</p>}
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-border">
                <div>
                  <p className="label-upper">ORDER TOTAL</p>
                  <p className="font-sans text-title-sm text-text-primary">{formatPaise(order.totalPaise)}</p>
                </div>
                <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                  <span className="font-sans text-label-md">View Details</span>
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center mt-8 gap-2 text-center">
        <div className="w-8 h-1 rounded-full bg-surface-container-high" />
        <p className="font-sans text-body-sm text-text-tertiary">
          Showing all {filteredOrders.length} orders · Need help? <a href="#" className="text-primary hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
