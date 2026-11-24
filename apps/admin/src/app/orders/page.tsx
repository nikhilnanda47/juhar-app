'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
import { appendUnique, loadAtLeast } from '../../services/paging';
import styles from './orders.module.css';

const STATUS_OPTIONS = ['all', 'placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

// How long an order has waited, in words ("25 min", "5 h", "2 days")
function formatWaiting(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h`;
  const days = Math.floor(minutes / (24 * 60));
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

const NEXT_STATUS: Record<string, string> = {
  placed: 'confirmed',
  confirmed: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

const CANCELLABLE = ['placed', 'confirmed'];

const STATUS_LABELS: Record<string, string> = {
  placed: 'Confirm',
  confirmed: 'Pack',
  packed: 'Ship',
  shipped: 'Deliver',
};

function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  // Only the newest request may change the list (a slow answer for an old filter is dropped)
  const requestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [filterReady, setFilterReady] = useState(false);
  const [counts, setCounts] = useState({ placed: 0, overdue: 0 });
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [shipModal, setShipModal] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [courierName, setCourierName] = useState('');
  const [cancelModal, setCancelModal] = useState<{ id: string; publicNumber: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [copiedUser, setCopiedUser] = useState<string | null>(null); // the user id just copied (shows "Copied")

  // The dashboard links here with ?filter=overdue; read it once before the first load
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('filter') === 'overdue') setFilter('overdue');
    setFilterReady(true);
  }, []);

  // One page of the list for the current filter and search
  const fetchOrders = (after?: string, limit = 20) => {
    const params: Record<string, string> = { limit: String(limit) };
    if (filter === 'overdue') params.overdue = 'true';
    else if (filter !== 'all') params.status = filter;
    if (search) params.search = search;
    if (after) params.cursor = after;
    return api.getOrders(params);
  };

  // Start the list again from the top (filter or search changed)
  const loadOrders = async () => {
    const mine = ++requestId.current;
    setLoadError('');
    try {
      const data = await fetchOrders();
      if (mine !== requestId.current) return;
      setOrders(data.items || []);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      if (data.counts) setCounts(data.counts);
    } catch {
      // AdminLayout handles auth
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  };

  // Refresh after an action, keeping as many rows on screen as there were
  const refreshOrders = async () => {
    const mine = ++requestId.current;
    try {
      const page = await loadAtLeast(
        (after, limit) => fetchOrders(after, limit),
        Math.max(orders.length, 20),
      );
      const fresh = (await api.getOrders({ limit: '1' })).counts;
      if (mine !== requestId.current) return;
      setOrders(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      if (fresh) setCounts(fresh);
    } catch {
      // keep what is on screen
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const mine = requestId.current;
    setLoadingMore(true);
    setLoadError('');
    try {
      const data = await fetchOrders(cursor);
      if (mine !== requestId.current) return; // the filter changed meanwhile
      setOrders((shown) => appendUnique(shown, data.items || []));
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      if (data.counts) setCounts(data.counts);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load more orders');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!filterReady) return;
    setLoading(true);
    loadOrders();
  }, [filter, filterReady]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    if (status === 'shipped') {
      setShipModal(orderId);
      return;
    }

    setUpdating(orderId);
    try {
      await api.updateOrderStatus(orderId, { status });
      await refreshOrders();
    } catch (err: any) {
      alert(err.message);
    }
    setUpdating(null);
  };

  const handleShip = async () => {
    if (!shipModal || !trackingId) return;
    setUpdating(shipModal);
    try {
      await api.updateOrderStatus(shipModal, {
        status: 'shipped',
        trackingId,
        courierName: courierName || 'Manual',
      });
      setShipModal(null);
      setTrackingId('');
      setCourierName('');
      await refreshOrders();
    } catch (err: any) {
      alert(err.message);
    }
    setUpdating(null);
  };

  // Copy a customer's user id, the same "user=<id>" that the API logs show
  const copyUserId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // clipboard blocked (plain http, old browser): select the text the old way
      const box = document.createElement('textarea');
      box.value = id;
      document.body.appendChild(box);
      box.select();
      document.execCommand('copy');
      document.body.removeChild(box);
    }
    setCopiedUser(id);
    setTimeout(() => setCopiedUser((current) => (current === id ? null : current)), 1500);
  };

  const closeCancelModal = () => {
    setCancelModal(null);
    setCancelReason('');
    setCancelError('');
  };

  const handleCancel = async () => {
    if (!cancelModal || !cancelReason.trim()) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.updateOrderStatus(cancelModal.id, { status: 'cancelled', reason: cancelReason.trim() });
      closeCancelModal();
      await refreshOrders();
    } catch (err: any) {
      setCancelError(err.message || 'Could not cancel the order');
    }
    setCancelling(false);
  };

  const searchInput = (
    <input
      className={styles.searchInput}
      placeholder="Search by order # or phone..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
    />
  );

  return (
    <AdminLayout title="Orders" actions={searchInput}>
      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={filter === s ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            className={
              filter === 'overdue'
                ? styles.filterActive
                : counts.overdue > 0
                  ? styles.filterOverdue
                  : styles.filterBtn
            }
            onClick={() => setFilter('overdue')}
            title="Cash-on-delivery orders still placed after 24 hours. Their stock stays held until you confirm or cancel them."
          >
            Overdue ({counts.overdue})
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading orders...</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.mono}>{order.publicNumber}</td>
                  <td>
                    <div className={styles.customerName}>{order.customer?.name || '—'}</div>
                    <div className={styles.phone}>{order.customer?.phone}</div>
                    {order.customer?.id && (
                      <div className={styles.userIdRow} title={`User ID: ${order.customer.id}`}>
                        <span className={styles.userId}>ID {order.customer.id.slice(0, 8)}</span>
                        <button
                          className={styles.copyBtn}
                          onClick={() => copyUserId(order.customer.id)}
                          aria-label={`Copy user ID ${order.customer.id}`}
                        >
                          {copiedUser === order.customer.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={styles.date}>
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {order.waitingMinutes != null && (
                      <div className={order.overdue ? styles.waitingOverdue : styles.waiting}>
                        waiting {formatWaiting(order.waitingMinutes)}
                      </div>
                    )}
                  </td>
                  <td>{order.itemCount}</td>
                  <td className={styles.price}>{formatPaise(order.totalPaise)}</td>
                  <td>
                    <span className={styles.payBadge}>
                      {order.paymentMode === 'cod' ? 'COD' : 'UPI'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles['status_' + order.status]}`}>
                      {order.status}
                    </span>
                    {order.overdue && (
                      <span
                        className={styles.overdueBadge}
                        title="Still placed after 24 hours. Its stock stays held until you confirm or cancel it."
                      >
                        Overdue
                      </span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {NEXT_STATUS[order.status] && (
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleStatusUpdate(order.id, NEXT_STATUS[order.status])}
                          disabled={updating === order.id}
                        >
                          {updating === order.id ? '...' : STATUS_LABELS[order.status]}
                        </button>
                      )}
                      {CANCELLABLE.includes(order.status) && (
                        <button
                          className={styles.cancelOrderBtn}
                          onClick={() => setCancelModal({ id: order.id, publicNumber: order.publicNumber })}
                          disabled={updating === order.id}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    <div className={styles.emptyIcon}>&#128230;</div>
                    <div>No orders found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className={styles.loadMoreBar}>
          <span className={styles.loadMoreInfo}>
            {hasMore ? `Showing ${orders.length} orders` : `All ${orders.length} orders shown`}
          </span>
          {hasMore && (
            <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
          {loadError && <span className={styles.loadMoreError}>{loadError}</span>}
        </div>
      )}

      {/* Ship Modal */}
      {shipModal && (
        <div className={styles.modalOverlay} onClick={() => { setShipModal(null); setTrackingId(''); setCourierName(''); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Ship Order</h3>
            <p className={styles.modalSubtext}>Enter tracking details to mark this order as shipped.</p>
            <div className={styles.modalField}>
              <label>Tracking ID *</label>
              <input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="e.g. DTDC123456" />
            </div>
            <div className={styles.modalField}>
              <label>Courier Name</label>
              <input value={courierName} onChange={(e) => setCourierName(e.target.value)} placeholder="e.g. DTDC, India Post" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelModalBtn} onClick={() => { setShipModal(null); setTrackingId(''); setCourierName(''); }}>Cancel</button>
              <button className={styles.confirmBtn} onClick={handleShip} disabled={!trackingId}>Ship Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className={styles.modalOverlay} onClick={closeCancelModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Cancel order {cancelModal.publicNumber}?</h3>
            <p className={styles.modalSubtext}>
              The reserved stock is released and this cannot be undone. A reason is required.
            </p>
            <div className={styles.modalField}>
              <label>Reason *</label>
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer unreachable"
                maxLength={255}
                autoFocus
              />
            </div>
            {cancelError && <p className={styles.modalError}>{cancelError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.cancelModalBtn} onClick={closeCancelModal} disabled={cancelling}>Keep order</button>
              <button className={styles.dangerBtn} onClick={handleCancel} disabled={!cancelReason.trim() || cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
