'use client';

import { useEffect, useState } from 'react';

/**
 * A saree photo that fills its box. The box needs `relative` and a shape (for example `aspect-[3/4]`) and its soft
 * background shows until the photo arrives, and for good when there is no photo (yet) or it cannot be loaded, so a
 * missing photo never leaves a broken-image icon.
 */
export default function ProductImage({
  src, alt, eager = false, className = '',
}: {
  src?: string | null;
  alt: string;
  /** the first photo on a page: load it at once instead of when it scrolls into view */
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]); // a new address gets a fresh try

  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={`absolute inset-0 w-full h-full object-cover ${className}`}
    />
  );
}
