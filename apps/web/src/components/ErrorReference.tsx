'use client';

import { useState } from 'react';

/**
 * A small "Reference: <id>" line under an error message, with a Copy button. The id is the one the
 * API logs as req=<id>, so a customer can read it out and support can find what happened.
 * Shows nothing when there is no reference (for example when the network was down).
 */
export default function ErrorReference({ id, className = '' }: { id?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      const box = document.createElement('textarea');
      box.value = id;
      document.body.appendChild(box);
      box.select();
      document.execCommand('copy');
      document.body.removeChild(box);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <p className={`font-sans text-label-sm text-text-tertiary flex items-center gap-2 ${className}`}>
      <span>Reference: <span className="font-mono select-all">{id}</span></span>
      <button type="button" onClick={copy} className="underline hover:text-primary" aria-label="Copy reference">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </p>
  );
}
