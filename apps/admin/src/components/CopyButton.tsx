'use client';

import { useState } from 'react';

/** A small "Copy" button that says "Copied" for a moment. Falls back to the old way when the browser blocks the clipboard. */
export default function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard blocked (plain http, old browser): select the text the old way
      const box = document.createElement('textarea');
      box.value = text;
      document.body.appendChild(box);
      box.select();
      document.execCommand('copy');
      document.body.removeChild(box);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button type="button" className={className} onClick={copy} aria-label={label}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
