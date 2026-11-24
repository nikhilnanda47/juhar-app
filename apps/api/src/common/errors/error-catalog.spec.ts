import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { CART } from '@juhar/shared';
import { KNOWN_ERROR_CODES, friendlyError } from './error-catalog';

describe('friendlyError', () => {
  it('turns a plain code into a sentence and keeps the code', () => {
    expect(friendlyError('INSUFFICIENT_STOCK')).toEqual({
      code: 'INSUFFICIENT_STOCK',
      message: expect.stringMatching(/not in stock in the quantity you asked for/),
    });
    expect(friendlyError('CART_EMPTY')?.message).toBe('Your bag is empty. Add a saree to your bag first.');
  });

  it('never shows the raw code, a SKU or a number to the customer', () => {
    for (const code of KNOWN_ERROR_CODES.filter((c) => c !== 'STOCK_MISMATCH')) {
      const message = friendlyError(code)!.message;
      expect(message).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
      expect(message.length).toBeGreaterThan(20);
    }
  });

  it('ignores the ": detail" part for customer wording (a SKU means nothing to a customer)', () => {
    const e = friendlyError('VARIANT_UNAVAILABLE: JUH-IKT-MRN-001')!;
    expect(e.code).toBe('VARIANT_UNAVAILABLE');
    expect(e.message).toBe('Sorry, this saree is no longer available.');
    expect(e.message).not.toContain('JUH-IKT');
  });

  it('keeps the detail for a stock mismatch, which is an admin message with the numbers in it', () => {
    const raw = 'STOCK_MISMATCH: JUH-X-1 has 3 on hand but the order needs 4. Correct the stock count first.';
    expect(friendlyError(raw)).toEqual({
      code: 'STOCK_MISMATCH',
      message: 'JUH-X-1 has 3 on hand but the order needs 4. Correct the stock count first.',
    });
    expect(friendlyError('STOCK_MISMATCH')?.message).toMatch(/Correct the stock count/);
  });

  it('puts the real order limit in the quantity message', () => {
    expect(friendlyError('QUANTITY_EXCEEDS_LIMIT')?.message).toContain(String(CART.MAX_QUANTITY_PER_VARIANT));
  });

  it('leaves everything else alone: sentences, unknown codes, other types', () => {
    expect(friendlyError('Order not found')).toBeNull();
    expect(friendlyError('A cancellation reason is required')).toBeNull();
    expect(friendlyError('SOME_UNKNOWN_CODE')).toBeNull();
    expect(friendlyError('lowercase_code')).toBeNull();
    expect(friendlyError('NOUNDERSCORE')).toBeNull();
    expect(friendlyError(undefined)).toBeNull();
    expect(friendlyError(['a', 'b'])).toBeNull();
    expect(friendlyError(42)).toBeNull();
  });
});

// A new `throw new XException('SOME_CODE')` without wording would reach customers as the bare code.
// This reads the API source and fails until the code is added to the catalog.
describe('every plain code the API throws has friendly wording', () => {
  const root = join(__dirname, '..', '..');
  const thrown = new Map<string, string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        const text = readFileSync(path, 'utf8');
        for (const m of text.matchAll(/new \w+Exception\(\s*[`'"]([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?::[^`'"]*)?[`'"]/g)) {
          thrown.set(m[1], path.replace(root, 'src'));
        }
      }
    }
  };
  walk(root);

  it('finds the codes the API really throws (so this test cannot pass by looking at nothing)', () => {
    expect([...thrown.keys()]).toEqual(expect.arrayContaining(['CART_EMPTY', 'INSUFFICIENT_STOCK', 'VARIANT_UNAVAILABLE']));
    expect(thrown.size).toBeGreaterThanOrEqual(10);
  });

  it('has wording for each of them', () => {
    const missing = [...thrown].filter(([code]) => !KNOWN_ERROR_CODES.includes(code)).map(([code, file]) => `${code} (${file})`);
    expect(missing).toEqual([]);
  });
});
