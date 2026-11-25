'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import OrderActions from '../../../components/OrderActions';
import CopyButton from '../../../components/CopyButton';
import { api, type AdminOrderDetail } from '../../../services/api';
import listStyles from '../orders.module.css';
import styles from './order-detail.module.css';

const money = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const STEP_WORDS: Record<string, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const ROLE_WORDS: Record<string, string> = {
  owner: 'owner',
  fulfillment_operator: 'fulfilment',
  catalog_editor: 'catalog',
  support: 'support',
};

// "cod_pending" -> "Cod pending" would read badly, so a few known words are spelled out
const PAYMENT_STATUS_WORDS: Record<string, string> = { cod_pending: 'Cash to collect', pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' };
const sentence = (s: string) => { const t = s.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };

// How long an order has waited, in words
function waiting(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h`;
  const days = Math.floor(minutes / (24 * 60));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** The address as lines of plain text, ready to paste onto a courier label or into a message */
function addressText(a: AdminOrderDetail['address']): string {
  return [
    a.recipientName,
    [a.line1, a.line2].filter(Boolean).join(', '),
    a.landmark ? `Landmark: ${a.landmark}` : '',
    `${a.city}, ${a.district}, ${a.state} - ${a.pinCode}`,
    `Phone: ${a.recipientPhone}`,
  ].filter(Boolean).join('\n');
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setOrder(await api.getOrder(id));
      setState('ready');
    } catch (err: any) {
      // AdminLayout handles a lost login; here it is a missing order or a failed request
      setMessage(err?.message || '');
      setState(/not found/i.test(err?.message || '') ? 'missing' : 'failed');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const back = (
    <Link href="/orders" className={styles.backLink}>← All orders</Link>
  );

  if (state !== 'ready' || !order) {
    return (
      <AdminLayout title="Order" actions={back}>
        <div className={styles.notice}>
          {state === 'loading' && 'Loading order...'}
          {state === 'missing' && 'This order was not found.'}
          {state === 'failed' && `Could not load this order. ${message}`}
        </div>
      </AdminLayout>
    );
  }

  const a = order.address;
  const units = order.items.reduce((sum, i) => sum + i.qty, 0);
  const open = order.status !== 'delivered' && order.status !== 'cancelled';
  const collect = order.paymentMode === 'cod' && open;

  return (
    <AdminLayout title={order.publicNumber} subtitle={`placed ${when(order.createdAt)}`} actions={back}>
      {/* Status and the next step */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span className={`${listStyles.statusBadge} ${listStyles['status_' + order.status]}`}>{order.status}</span>
          {order.overdue && <span className={listStyles.overdueBadge}>Overdue</span>}
          {order.waitingMinutes != null && (
            <span className={order.overdue ? listStyles.waitingOverdue : listStyles.waiting}>waiting {waiting(order.waitingMinutes)}</span>
          )}
          <span className={styles.muted}>{units} {units === 1 ? 'piece' : 'pieces'} · {order.paymentMode === 'cod' ? 'Cash on delivery' : 'UPI'}</span>
        </div>
        <OrderActions order={order} onChanged={load} />
      </div>

      {order.status === 'cancelled' && (
        <div className={styles.cancelledBox}>
          <strong>Cancelled.</strong> {order.cancellationReason ? `Reason: ${order.cancellationReason}` : 'No reason recorded.'}
        </div>
      )}
      {collect && (
        <div className={styles.collectBox}>
          Collect <strong>{money(order.totalPaise)}</strong> in cash from the customer when this is delivered.
        </div>
      )}

      <div className={styles.grid}>
        {/* Left: what to pack, the money, the story */}
        <div className={styles.col}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Items to pack</h2>
            <table className={styles.itemsTable}>
              <thead>
                <tr><th>Saree</th><th>SKU</th><th className={styles.num}>Qty</th><th className={styles.num}>Price</th><th className={styles.num}>Total</th></tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className={styles.itemTitle}>{i.productTitle}</div>
                      <div className={styles.muted}>{[i.color, i.variantName].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    <td className={styles.mono}>{i.sku}</td>
                    <td className={styles.num}><strong>{i.qty}</strong></td>
                    <td className={styles.num}>{money(i.unitPricePaise)}</td>
                    <td className={styles.num}>{money(i.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className={styles.totals}>
              <div><dt>Subtotal</dt><dd>{money(order.subtotalPaise)}</dd></div>
              {order.discountPaise > 0 && <div><dt>Discount</dt><dd>−{money(order.discountPaise)}</dd></div>}
              <div><dt>Shipping</dt><dd>{order.shippingPaise === 0 ? 'Free' : money(order.shippingPaise)}</dd></div>
              {order.taxPaise > 0 && <div><dt>Tax</dt><dd>{money(order.taxPaise)}</dd></div>}
              <div className={styles.grand}><dt>Total</dt><dd>{money(order.totalPaise)}</dd></div>
            </dl>
            {order.notes && <p className={styles.notes}><strong>Customer note:</strong> {order.notes}</p>}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>History</h2>
            <ol className={styles.timeline}>
              {order.history.map((h, n) => (
                <li key={n} className={styles.timelineItem}>
                  <span className={`${styles.dot} ${h.status === 'cancelled' ? styles.dotCancelled : ''}`} />
                  <div>
                    <div className={styles.timelineTitle}>{STEP_WORDS[h.status] || h.status}</div>
                    <div className={styles.muted}>
                      {when(h.at)} · {h.by ? (h.by.role ? `${h.by.name} (${ROLE_WORDS[h.by.role] || h.by.role})` : h.by.name) : h.status === 'placed' ? 'the customer' : 'the customer or the system'}
                    </div>
                    {h.reason && <div className={styles.reason}>Reason: {h.reason}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right: where it goes, who to call, how it travels */}
        <div className={styles.col}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Deliver to</h2>
              <CopyButton text={addressText(a)} label="Copy the full delivery address" className={listStyles.copyBtn} />
            </div>
            <address className={styles.address}>
              <strong>{a.recipientName}</strong>
              <span>{[a.line1, a.line2].filter(Boolean).join(', ')}</span>
              {a.landmark && <span>Landmark: {a.landmark}</span>}
              <span>{a.city}, {a.district}</span>
              <span>{a.state} — <strong>{a.pinCode}</strong></span>
            </address>
            <div className={styles.phoneRow}>
              <span className={styles.mono}>{a.recipientPhone}</span>
              <CopyButton text={a.recipientPhone} label="Copy the delivery phone number" className={listStyles.copyBtn} />
            </div>
            <p className={styles.hint}>This is the address chosen at checkout. Changing a saved address later does not change it.</p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Customer</h2>
            {order.customer ? (
              <>
                <div className={styles.itemTitle}>{order.customer.name || '—'}</div>
                <div className={styles.phoneRow}>
                  <span className={styles.mono}>{order.customer.phone}</span>
                  <CopyButton text={order.customer.phone} label="Copy the customer's phone number" className={listStyles.copyBtn} />
                </div>
                <div className={styles.phoneRow}>
                  <span className={styles.muted} title={order.customer.id}>User ID {order.customer.id.slice(0, 8)}</span>
                  <CopyButton text={order.customer.id} label={`Copy user ID ${order.customer.id}`} className={listStyles.copyBtn} />
                </div>
              </>
            ) : (
              <p className={styles.muted}>No customer record.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Payment</h2>
            <div className={styles.kv}><span>Method</span><strong>{order.paymentMode === 'cod' ? 'Cash on delivery' : 'UPI'}</strong></div>
            <div className={styles.kv}><span>Status</span><strong>{PAYMENT_STATUS_WORDS[order.paymentStatus] || sentence(order.paymentStatus)}</strong></div>
            <div className={styles.kv}><span>Amount</span><strong>{money(order.totalPaise)}</strong></div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Shipment</h2>
            {order.shipments.length === 0 ? (
              <p className={styles.muted}>Not shipped yet.</p>
            ) : (
              order.shipments.map((s) => (
                <div key={s.id} className={styles.shipment}>
                  <div className={styles.kv}><span>Courier</span><strong>{s.carrier || '—'}</strong></div>
                  <div className={styles.phoneRow}>
                    <span>Tracking ID <strong className={styles.mono}>{s.trackingId || '—'}</strong></span>
                    {s.trackingId && <CopyButton text={s.trackingId} label="Copy the tracking ID" className={listStyles.copyBtn} />}
                  </div>
                  <div className={styles.kv}><span>Status</span><strong>{sentence(s.status)}</strong></div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
