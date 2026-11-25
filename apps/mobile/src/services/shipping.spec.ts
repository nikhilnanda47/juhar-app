// Same checks as the web copy (apps/web/src/lib/shipping.spec.ts): the mobile app cannot import the web file.
export {}; // keeps this file a module
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore[k] ?? null,
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    removeItem: async (k: string) => { delete mockStore[k]; },
  },
}));

// The helpers must follow whatever rule the API publishes, so these tests use rules that are
// NOT today's ₹99 / free from ₹5,000: a screen that had the old numbers typed in would fail them.
const RULE = { flatPaise: 7000, freeAbovePaise: 300000 };

function load(fetchImpl: (url: string) => Promise<unknown>) {
  jest.resetModules();
  (global as any).fetch = jest.fn(fetchImpl);
  return require('./shipping') as typeof import('./shipping');
}

const ok = (data: unknown) => Promise.resolve({ status: 200, json: async () => ({ success: true, data }) });
const fail = () => Promise.resolve({ status: 500, json: async () => ({ success: false, error: { code: 'X', message: 'down' } }) });

describe('shipping helpers follow the published rule', () => {
  const s = load(() => ok(RULE));

  it('shippingFor charges the flat rate below the free amount and nothing from it upwards', () => {
    expect(s.shippingFor(0, RULE)).toBe(7000);
    expect(s.shippingFor(299999, RULE)).toBe(7000);
    expect(s.shippingFor(300000, RULE)).toBe(0);
    expect(s.shippingFor(900000, RULE)).toBe(0);
  });

  it('remainingForFreeShipping says how much more is needed, never below zero', () => {
    expect(s.remainingForFreeShipping(100000, RULE)).toBe(200000);
    expect(s.remainingForFreeShipping(300000, RULE)).toBe(0);
    expect(s.remainingForFreeShipping(500000, RULE)).toBe(0);
  });

  it('shippingProgressPercent runs from 0 to 100 and stops at 100', () => {
    expect(s.shippingProgressPercent(0, RULE)).toBe(0);
    expect(s.shippingProgressPercent(150000, RULE)).toBe(50);
    expect(s.shippingProgressPercent(300000, RULE)).toBe(100);
    expect(s.shippingProgressPercent(900000, RULE)).toBe(100);
  });

  it('a rule where delivery is always free does not divide by zero', () => {
    expect(s.shippingProgressPercent(0, { flatPaise: 0, freeAbovePaise: 0 })).toBe(100);
    expect(s.shippingFor(0, { flatPaise: 0, freeAbovePaise: 0 })).toBe(0);
  });
});

describe('loadShippingRule', () => {
  it('asks the API once and shares the answer', async () => {
    const s = load(() => ok(RULE));
    const [a, b] = await Promise.all([s.loadShippingRule(), s.loadShippingRule()]);
    await s.loadShippingRule();
    expect(a).toEqual(RULE);
    expect(b).toEqual(RULE);
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    expect(String((global as any).fetch.mock.calls[0][0])).toContain('/api/v1/config/shipping');
  });

  it('does not remember a failure: the next screen tries again', async () => {
    let calls = 0;
    const s = load(() => (++calls === 1 ? fail() : ok(RULE)));
    await expect(s.loadShippingRule()).rejects.toThrow('down');
    await expect(s.loadShippingRule()).resolves.toEqual(RULE);
    expect(calls).toBe(2);
  });
});

// The rule lives in the API only. A screen with the numbers typed in would drift from it.
describe('no screen types the shipping numbers in', () => {
  it('mobile source has no 9900, 500000, 5,000 or ₹99 (outside tests)', () => {
    const root = join(__dirname, '..');
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !/\.spec\.ts$/.test(name) && /\b(9900|500000)\b|5,000|₹\s?99\b/.test(readFileSync(path, 'utf8'))) {
          found.push(path.replace(root, 'src'));
        }
      }
    };
    walk(root);
    expect(found).toEqual([]);
  });
});
