'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDIA } from '@juhar/shared';
import { checkPickedFiles, movePhoto, photoCountText } from '../lib/photos';
import styles from './PhotoManager.module.css';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/**
 * The Photos section of the Create Product page. A photo has to belong to a saree that exists, so nothing is sent
 * here: the pictures are chosen, checked, shown and put in order, and the page uploads them right after the product
 * is saved. (On the Edit page, PhotoManager works on a saved product and uploads at once.)
 */
export default function PendingPhotos({ files, onChange, disabled = false }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const full = files.length >= MEDIA.MAX_PER_PRODUCT;

  // a preview address per file, released when the file leaves the list
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (picked: File[]) => {
    const { accepted, problems: refused } = checkPickedFiles(picked, files.length);
    setProblems(refused);
    if (accepted.length > 0) onChange([...files, ...accepted]);
  };

  const pick = (list: FileList | null) => {
    if (list && list.length > 0) add(Array.from(list));
    if (input.current) input.current.value = ''; // so the same file can be picked again
  };

  const move = (index: number, direction: -1 | 1) => {
    const order = movePhoto(files.map((_, i) => String(i)), index, direction);
    if (order) onChange(order.map((i) => files[Number(i)]));
  };

  return (
    <div>
      <div
        className={`${styles.drop} ${dragging ? styles.dropActive : ''} ${full ? styles.dropFull : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !full) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) add(Array.from(e.dataTransfer.files)); }}
      >
        <div>{full ? 'This saree has the most photos it can have. Remove one to add another.' : 'Drag photos here, or'}</div>
        <input ref={input} type="file" className={styles.hiddenInput} accept={MEDIA.ACCEPTED_TYPES.join(',')} multiple
          onChange={(e) => pick(e.target.files)} data-testid="pending-photo-input" aria-label="Choose photos" />
        <button type="button" className={styles.pickBtn} disabled={disabled || full} onClick={() => input.current?.click()}>
          Choose photos
        </button>
        <p className={styles.fine}>
          JPG, PNG or WebP, up to {MEDIA.MAX_FILE_BYTES / (1024 * 1024)} MB each and at least {MEDIA.MIN_SIDE_PX} pixels on the shorter side.
          They are uploaded when you save the product, and shrunk automatically. The first photo is the cover shown on cards.
          You can add or change photos later from the product&apos;s Edit page.
        </p>
      </div>

      {problems.length > 0 && (
        <ul className={styles.problems} role="alert">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      <p className={styles.fine} data-testid="pending-photo-count">{photoCountText(files.length)}</p>

      {files.length > 0 && (
        <ul className={styles.grid} aria-label="Photos to upload">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`} className={styles.card} data-testid="pending-photo-card">
              <div className={styles.thumb}>
                <img src={previews[index]} alt={`Photo ${index + 1}: ${file.name}`} />
                {index === 0 && <span className={styles.cover}>Cover</span>}
                <span className={styles.position}>{index + 1} / {files.length}</span>
                <div className={styles.tools}>
                  <button type="button" className={styles.tool} aria-label={`Move photo ${index + 1} earlier`} title="Move earlier"
                    disabled={disabled || index === 0} onClick={() => move(index, -1)}>←</button>
                  <button type="button" className={styles.tool} aria-label={`Move photo ${index + 1} later`} title="Move later"
                    disabled={disabled || index === files.length - 1} onClick={() => move(index, 1)}>→</button>
                  <button type="button" className={`${styles.tool} ${styles.toolRemove}`} aria-label={`Remove photo ${index + 1}`} title="Remove"
                    disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))}>✕</button>
                </div>
              </div>
              <div className={styles.fields}>
                <span className={styles.fine}>{file.name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
