'use client';

import { useRef, useState } from 'react';
import { MEDIA } from '@juhar/shared';
import { api, type AdminPhoto, messageOf } from '../services/api';
import { checkPickedFiles, movePhoto, photoCountText } from '../lib/photos';
import styles from './PhotoManager.module.css';

interface Props {
  productId: string;
  photos: AdminPhoto[];
  /** the colours of this saree, for "which colour does this photo show" */
  colours: { id: string; label: string }[];
  /** called with the whole new list after every change that reached the server */
  onChange: (photos: AdminPhoto[]) => void;
  /** only owners and catalog editors may change photos; everyone else only looks */
  canEdit?: boolean;
}

/**
 * The Photos section of a product: pick or drop pictures, put them in order (the first is the cover), say which
 * colour a photo shows, remove one. Every change is saved at once (it does not wait for "Save changes"), because a
 * photo is a file already uploaded, not a form field.
 */
export default function PhotoManager({ productId, photos, colours, onChange, canEdit = true }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const full = photos.length >= MEDIA.MAX_PER_PRODUCT;
  const locked = !canEdit || uploading !== null;

  /** Sends the picked files one after another (so they keep the order picked), reporting each one that fails */
  const upload = async (picked: File[]) => {
    setError('');
    const { accepted, problems: refused } = checkPickedFiles(picked, photos.length);
    const failed: string[] = [...refused];
    let latest = photos;
    if (accepted.length > 0) {
      for (let i = 0; i < accepted.length; i++) {
        setUploading({ done: i, total: accepted.length });
        try {
          latest = await api.uploadPhoto(productId, accepted[i]);
          onChange(latest);
        } catch (e) {
          failed.push(`${accepted[i].name}: ${messageOf(e, 'could not be uploaded.')}`);
        }
      }
      setUploading(null);
    }
    setProblems(failed);
  };

  const run = async (id: string, action: () => Promise<AdminPhoto[]>) => {
    setBusyId(id); setError(''); setProblems([]);
    try { onChange(await action()); }
    catch (e) { setError(messageOf(e, 'That did not work. Please try again.')); }
    finally { setBusyId(null); }
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = movePhoto(photos.map((p) => p.id), index, direction);
    if (next) run(photos[index].id, () => api.reorderPhotos(productId, next));
  };

  const remove = (photo: AdminPhoto, index: number) => {
    if (!window.confirm(`Remove photo ${index + 1}${index === 0 ? ' (the cover)' : ''}? This cannot be undone.`)) return;
    run(photo.id, () => api.removePhoto(productId, photo.id));
  };

  const pick = (list: FileList | null) => {
    if (list && list.length > 0) upload(Array.from(list));
    if (input.current) input.current.value = ''; // so the same file can be picked again
  };

  return (
    <div>
      {canEdit && (
        <div
          className={`${styles.drop} ${dragging ? styles.dropActive : ''} ${full ? styles.dropFull : ''}`}
          onDragOver={(e) => { e.preventDefault(); if (!locked && !full) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!locked) upload(Array.from(e.dataTransfer.files)); }}
        >
          <div>{full ? 'This saree has the most photos it can have. Remove one to add another.' : 'Drag photos here, or'}</div>
          <input ref={input} type="file" className={styles.hiddenInput} accept={MEDIA.ACCEPTED_TYPES.join(',')} multiple
            onChange={(e) => pick(e.target.files)} data-testid="photo-input" aria-label="Choose photos" />
          <button type="button" className={styles.pickBtn} disabled={locked || full} onClick={() => input.current?.click()}>
            Choose photos
          </button>
          <p className={styles.fine}>
            JPG, PNG or WebP, up to {MEDIA.MAX_FILE_BYTES / (1024 * 1024)} MB each and at least {MEDIA.MIN_SIDE_PX} pixels on the shorter side. They are shrunk
            automatically. Photos are saved as soon as they are added. The first photo is the cover shown on cards.
          </p>
          {uploading && (
            <div className={styles.progress} role="status">
              <span className={styles.spinner} />
              Uploading photo {uploading.done + 1} of {uploading.total}...
            </div>
          )}
        </div>
      )}

      {problems.length > 0 && (
        <ul className={styles.problems} role="alert">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}

      <p className={styles.fine} data-testid="photo-count">{photoCountText(photos.length)}</p>

      {photos.length === 0 ? (
        <p className={styles.empty}>The shop shows a grey box for this saree until a photo is added.</p>
      ) : (
        <ul className={styles.grid} aria-label="Photos">
          {photos.map((photo, index) => (
            <li key={photo.id} className={`${styles.card} ${busyId === photo.id ? styles.cardBusy : ''}`} data-testid="photo-card">
              <div className={styles.thumb}>
                <img src={photo.thumbnailUrl} alt={photo.altText || `Photo ${index + 1}`} loading="lazy" />
                {index === 0 && <span className={styles.cover}>Cover</span>}
                <span className={styles.position}>{index + 1} / {photos.length}</span>
                {canEdit && (
                  <div className={styles.tools}>
                    <button type="button" className={styles.tool} aria-label={`Move photo ${index + 1} earlier`} title="Move earlier"
                      disabled={locked || index === 0} onClick={() => move(index, -1)}>←</button>
                    <button type="button" className={styles.tool} aria-label={`Move photo ${index + 1} later`} title="Move later"
                      disabled={locked || index === photos.length - 1} onClick={() => move(index, 1)}>→</button>
                    <button type="button" className={`${styles.tool} ${styles.toolRemove}`} aria-label={`Remove photo ${index + 1}`} title="Remove"
                      disabled={locked} onClick={() => remove(photo, index)}>✕</button>
                  </div>
                )}
              </div>
              <div className={styles.fields}>
                <label htmlFor={`alt-${photo.id}`}>Description</label>
                <input id={`alt-${photo.id}`} type="text" defaultValue={photo.altText ?? ''} maxLength={255} disabled={locked}
                  placeholder="For screen readers, optional"
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== (photo.altText ?? '')) run(photo.id, () => api.updatePhoto(productId, photo.id, { altText: value || null }));
                  }} />
                <label htmlFor={`colour-${photo.id}`}>Shows</label>
                <select id={`colour-${photo.id}`} value={photo.variantId ?? ''} disabled={locked}
                  onChange={(e) => run(photo.id, () => api.updatePhoto(productId, photo.id, { variantId: e.target.value || null }))}>
                  <option value="">The whole saree</option>
                  {colours.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
