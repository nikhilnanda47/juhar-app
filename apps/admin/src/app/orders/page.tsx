'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
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

  // The dashboard links here with ?filter=overdue; read it once before the first load
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('filter') === 'overdue') setFilter('overdue');
    setFilterReady(true);
  }, []);

  const loadOrders = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter === 'overdue') params.overdue = 'true';
      else if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const data = await api.getOrders(params);
      setOrders(data.items || []);
      if (data.counts) setCounts(data.counts);
    } catch {
      // AdminLayout handles auth
    } finally {
      setLoading(false);
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
      await loadOrders();
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
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
    setUpdating(null);
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
      await loadOrders();
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
