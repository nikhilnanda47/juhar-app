export {}; // keeps this file a module
let mockStore: Record<string, string> = { juhar_token: 'TOKEN' };
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => mockStore[k] ?? null,
    setItem: async (k: string, v: string) => { mockStore[k] = v; },
    removeItem: async (k: string) => { delete mockStore[k]; },
  },
}));
import { appendUnique } from './paging';

function load(fetchImpl: (url: string) => Promise<unknown>) {
  jest.resetModules();
  (global as any).fetch = jest.fn(fetchImpl);
  return require('./api') as typeof import('./api');
}
const ok = (data: unknown) => Promise.resolve({ status: 200, json: async () => ({ success: true, data }) });
const urlOf = () => String((global as any).fetch.mock.calls[0][0]).replace(/^https?:\/\/[^/]+/, '');

describe('getOrders (customer order list, one page at a time)', () => {
  it('asks for the first page with no parameters', async () => {
    const api = load(() => ok({ items: [], cursor: null, hasMore: false, total: 0, counts: {} }));
    await api.getOrders();
    expect(urlOf()).toBe('/api/v1/orders');
  });

  it('sends the status filter, the cursor and the limit', async () => {
    const api = load(() => ok({ items: [], cursor: null, hasMore: false, total: 0, counts: {} }));
    await api.getOrders({ status: 'delivered', cursor: 'abc', limit: 1 });
    expect(urlOf()).toBe('/api/v1/orders?status=delivered&cursor=abc&limit=1');
  });

  it('returns the page with its cursor, total and per-status counts', async () => {
    const api = load(() => ok({ items: [{ id: 'a' }], cursor: 'a', hasMore: true, total: 47, counts: { placed: 5, delivered: 42 } }));
    expect(await api.getOrders()).toEqual({ items: [{ id: 'a' }], cursor: 'a', hasMore: true, total: 47, counts: { placed: 5, delivered: 42 } });
  });

  it('copes with an older API that sends only items (total = what it sent, nothing more to load)', async () => {
    const api = load(() => ok({ items: [{ id: 'a' }, { id: 'b' }] }));
    expect(await api.getOrders()).toEqual({ items: [{ id: 'a' }, { id: 'b' }], cursor: null, hasMore: false, total: 2, counts: {} });
  });
});

describe('appendUnique', () => {
  it('adds the next page after the rows shown and skips repeats', () => {
    expect(appendUnique([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('getProducts (shop list, one page at a time)', () => {
  it('returns the page with its cursor and the total number of matching products', async () => {
    const api = load(() => ok({ items: [{ id: 'a' }], cursor: 'a', hasMore: true, total: 58 }));
    expect(await api.getProducts({ limit: '20', sortBy: 'price_asc' })).toEqual({ items: [{ id: 'a' }], cursor: 'a', hasMore: true, total: 58 });
    expect(urlOf()).toBe('/api/v1/products?limit=20&sortBy=price_asc');
  });

  it('copes with an older API that sends no total (falls back to what it sent)', async () => {
    const api = load(() => ok({ items: [{ id: 'a' }, { id: 'b' }], cursor: null, hasMore: false }));
    expect((await api.getProducts()).total).toBe(2);
  });
});

describe('getProductFilters (what the shop filters offer)', () => {
  it('returns the lists and the price range the API sent', async () => {
    const api = load(() => ok({ fabrics: ['Pure Silk'], weaveMethods: ['Bomkai'], colors: ['Maroon'], minPricePaise: 120000, maxPricePaise: 1490000 }));
    expect(await api.getProductFilters()).toEqual({ fabrics: ['Pure Silk'], weaveMethods: ['Bomkai'], colors: ['Maroon'], minPricePaise: 120000, maxPricePaise: 1490000 });
    expect(urlOf()).toBe('/api/v1/products/filters');
  });

  it('copes with an older API that has no filter endpoint data (empty lists, no range)', async () => {
    const api = load(() => ok({}));
    expect(await api.getProductFilters()).toEqual({ fabrics: [], weaveMethods: [], colors: [], minPricePaise: null, maxPricePaise: null });
  });
});
