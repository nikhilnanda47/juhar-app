import { useCallback, useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { showAlert } from './showAlert';

export function useCopyToClipboard(resetMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      showAlert('Could not copy automatically', text);
      return;
    }
    setCopiedKey(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedKey(null), resetMs);
  }, [resetMs]);

  return { copiedKey, copy };
}
