'use client';

import { useEffect, useState } from 'react';
import { api, type StockChange, type StockReason } from '../services/api';
import styles from './StockAdjustModal.module.css';

type Mode = 'add' | 'remove' | 'set';

const REASONS: { value: StockReason; label: string }[] = [
  { value: 'received', label: 'New stock received' },
  { value: 'return_restocked', label: 'Customer return put back on the shelf' },
  { value: 'damaged', label: 'Damaged or lost' },
  { value: 'correction', label: 'Recount / correction' },
  { value: 'other', label: 'Other' },
];
const DEFAULT_REASON: Record<Mode, StockReason> = { add: 'received', remove: 'damaged', set: 'correction' };
const REASON_WORDS = Object.fromEntries(REASONS.map((r) => [r.value, r.label])) as Record<string, string>;

export interface StockTarget {
  variantId: string;
  productTitle: string;
  sku: string;
  label: string; // colour or variant name
  onHand: number;
  reserved: number;
  unavailable: number;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Change the stock of one colour: add pieces, remove pieces, or type the number counted on the shelf.
 * Shows what the stock will be before saving, refuses to go below what customers' orders have reserved,
 * and lists the recent changes (who, when, why).
 */
export default function StockAdjustModal({ target, onClose, onSaved }: {
  target: StockTarget;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>('add');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState<StockReason>('received');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<StockChange[] | null>(null);

  useEffect(() => {
    api.getStockHistory(target.variantId).then(setHistory).catch(() => setHistory([]));
  }, [target.variantId]);

  const chooseMode = (m: Mode) => { setMode(m); setReason(DEFAULT_REASON[m]); setError(''); };

  const n = qty.trim() === '' ? null : Number(qty);
  const whole = n !== null && Number.isInteger(n);
  const floor = target.reserved + target.unavailable; // stock cannot drop below this
  const newOnHand = !whole ? null : mode === 'add' ? target.onHand + n! : mode === 'remove' ? target.onHand - n! : n!;
  const change = newOnHand === null ? null : newOnHand - target.onHand;

  let problem = '';
  if (n !== null && !whole) problem = 'Use a whole number.';
  else if (n !== null && n < (mode === 'set' ? 0 : 1)) problem = mode === 'set' ? 'The count cannot be negative.' : 'Enter 1 or more.';
  else if (n !== null && n > 10_000 && mode !== 'set') problem = 'That is more than 10,000 pieces in one change. Check the number.';
  else if (n !== null && n > 100_000) problem = 'That is more than 100,000 pieces. Check the number.';
  else if (newOnHand !== null && newOnHand < 0) problem = `Only ${target.onHand} on hand, so ${n} cannot be removed.`;
  else if (newOnHand !== null && newOnHand < floor) {
    problem = `That would leave ${newOnHand} on hand, below the ${floor} that customers' orders have reserved${target.unavailable ? ' or marked unavailable' : ''}.`;
  } else if (change === 0) problem = 'That is the same as the current stock.';

  const ready = n !== null && !problem && !saving;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    setError('');
    try {
      await api.adjustStock({
        variantId: target.variantId,
        ...(mode === 'set' ? { setTo: n! } : { adjustment: mode === 'add' ? n! : -n! }),
        reason,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(/required role/i.test(err?.message || '')
        ? 'Your role cannot change stock. Ask an owner or a catalog editor.'
        : err?.message || 'Could not change the stock. Please try again.');
      setSaving(false);
    }
  };

  const availableNow = target.onHand - floor;
  const availableAfter = newOnHand === null ? null : newOnHand - floor;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-label="Adjust stock" onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Adjust stock</h3>
        <p className={styles.sub}>
          <strong>{target.productTitle}</strong> · {target.label} · <span className={styles.mono}>{target.sku}</span>
        </p>

        <div className={styles.now}>
          <div><span>On hand</span><strong>{target.onHand}</strong></div>
          <div><span>Reserved</span><strong>{target.reserved}</strong></div>
          <div><span>Available</span><strong>{availableNow}</strong></div>
        </div>

        <div className={styles.modes} role="tablist">
          {([['add', 'Add'], ['remove', 'Remove'], ['set', 'Set count']] as [Mode, string][]).map(([m, label]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m}
              className={mode === m ? styles.modeActive : styles.mode} onClick={() => chooseMode(m)}>
              {label}
            </button>
          ))}
        </div>

        <div className={styles.field}>
          <label>{mode === 'add' ? 'How many pieces to add' : mode === 'remove' ? 'How many pieces to remove' : 'Pieces counted on the shelf'}</label>
          <input
            type="number" min={mode === 'set' ? 0 : 1} step={1} inputMode="numeric"
            value={qty} onChange={(e) => { setQty(e.target.value); setError(''); }}
            placeholder={mode === 'set' ? String(target.onHand) : '1'} autoFocus
          />
        </div>

        {newOnHand !== null && !problem && (
          <p className={styles.preview}>
            On hand will be <strong>{newOnHand}</strong> ({change! > 0 ? '+' : ''}{change}), available <strong>{availableAfter}</strong>.
          </p>
        )}
        {problem && <p className={styles.problem}>{problem}</p>}

        <div className={styles.field}>
          <label>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value as StockReason)}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Note <span className={styles.optional}>(optional)</span></label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} placeholder="e.g. Batch from the Sonepur weavers" />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className={styles.save} onClick={save} disabled={!ready}>
            {saving ? 'Saving...' : 'Save stock change'}
          </button>
        </div>

        <div className={styles.history}>
          <h4>Recent changes</h4>
          {history === null && <p className={styles.muted}>Loading...</p>}
          {history !== null && history.length === 0 && <p className={styles.muted}>No manual changes yet.</p>}
          {history !== null && history.map((h, i) => (
            <div key={i} className={styles.historyRow}>
              <span className={(h.adjustment ?? 0) >= 0 ? styles.plus : styles.minus}>
                {(h.adjustment ?? 0) > 0 ? '+' : ''}{h.adjustment}
              </span>
              <div>
                <div>
                  {h.onHandBefore} → {h.onHandAfter} · {h.reason ? REASON_WORDS[h.reason] || h.reason : '—'}
                </div>
                <div className={styles.muted}>
                  {when(h.at)} · {h.by ? h.by.name : 'unknown'}{h.notes ? ` · ${h.notes}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
