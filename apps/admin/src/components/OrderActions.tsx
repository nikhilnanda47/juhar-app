'use client';

import { useState } from 'react';
import { api } from '../services/api';
import styles from '../app/orders/orders.module.css';

// The next step for each status, and the label on its button
export const NEXT_STATUS: Record<string, string> = {
  placed: 'confirmed',
  confirmed: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};
export const NEXT_LABEL: Record<string, string> = {
  placed: 'Confirm',
  confirmed: 'Pack',
  packed: 'Ship',
  shipped: 'Deliver',
};
export const CANCELLABLE = ['placed', 'confirmed'];

interface Props {
  order: { id: string; publicNumber: string; status: string };
  /** called after a step succeeded, so the page can read the order (or the list) again */
  onChanged: () => void | Promise<void>;
}

/**
 * The buttons that move an order forward (Confirm, Pack, Ship, Deliver) or cancel it, with the two
 * pop-ups they need: tracking details for Ship and a required reason for Cancel.
 * The orders list and the order page both use it, so they always behave the same.
 */
export default function OrderActions({ order, onChanged }: Props) {
  const [updating, setUpdating] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [courierName, setCourierName] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const next = NEXT_STATUS[order.status];

  const step = async () => {
    if (next === 'shipped') { setShipOpen(true); return; }
    setUpdating(true);
    try {
      await api.updateOrderStatus(order.id, { status: next });
      await onChanged();
    } catch (err: any) {
      alert(err.message);
    }
    setUpdating(false);
  };

  const closeShip = () => { setShipOpen(false); setTrackingId(''); setCourierName(''); };

  const ship = async () => {
    if (!trackingId) return;
    setUpdating(true);
    try {
      await api.updateOrderStatus(order.id, { status: 'shipped', trackingId, courierName: courierName || 'Manual' });
      closeShip();
      await onChanged();
    } catch (err: any) {
      alert(err.message);
    }
    setUpdating(false);
  };

  const closeCancel = () => { setCancelOpen(false); setCancelReason(''); setCancelError(''); };

  const cancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.updateOrderStatus(order.id, { status: 'cancelled', reason: cancelReason.trim() });
      closeCancel();
      await onChanged();
    } catch (err: any) {
      setCancelError(err.message || 'Could not cancel the order');
    }
    setCancelling(false);
  };

  if (!next && !CANCELLABLE.includes(order.status)) return null;

  return (
    <>
      <div className={styles.actions}>
        {next && (
          <button className={styles.actionBtn} onClick={step} disabled={updating}>
            {updating ? '...' : NEXT_LABEL[order.status]}
          </button>
        )}
        {CANCELLABLE.includes(order.status) && (
          <button className={styles.cancelOrderBtn} onClick={() => setCancelOpen(true)} disabled={updating}>
            Cancel
          </button>
        )}
      </div>

      {shipOpen && (
        <div className={styles.modalOverlay} onClick={closeShip}>
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
              <button className={styles.cancelModalBtn} onClick={closeShip}>Cancel</button>
              <button className={styles.confirmBtn} onClick={ship} disabled={!trackingId || updating}>Ship Order</button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className={styles.modalOverlay} onClick={closeCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Cancel order {order.publicNumber}?</h3>
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
              <button className={styles.cancelModalBtn} onClick={closeCancel} disabled={cancelling}>Keep order</button>
              <button className={styles.dangerBtn} onClick={cancel} disabled={!cancelReason.trim() || cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
