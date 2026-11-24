import {
  NO_FILTERS, SORT_OPTIONS, activeFilterCount, effectiveSearch, filterChips, parseRupees,
  priceRangeError, removeFilter, shopQuery, sortLabel, type ShopFilters,
} from './shop-list';
import { appendUnique } from './paging';

const filters = (over: Partial<ShopFilters>): ShopFilters => ({ ...NO_FILTERS, ...over });

describe('shopQuery', () => {
  it('asks for the first 20 newest sarees when nothing is chosen', () => {
    expect(shopQuery({})).toEqual({ limit: '20', sortBy: 'newest' });
  });

  it('sends the chosen sort, category and search', () => {
    expect(shopQuery({ sort: 'price_asc', categoryId: 'cat-1', search: 'ikat' })).toEqual({
      limit: '20', sortBy: 'price_asc', categoryId: 'cat-1', search: 'ikat',
    });
  });

  it('sends the cursor for the next page, with the same sort and filters', () => {
    expect(shopQuery({ sort: 'price_desc', categoryId: 'cat-1', filters: filters({ fabric: 'Pure Silk' }), cursor: 'abc' })).toEqual({
      limit: '20', sortBy: 'price_desc', categoryId: 'cat-1', fabric: 'Pure Silk', cursor: 'abc',
    });
  });

  it('leaves out an empty category, a blank search and no cursor, and trims the search', () => {
    expect(shopQuery({ categoryId: null, search: '   ', cursor: null })).toEqual({ limit: '20', sortBy: 'newest' });
    expect(shopQuery({ search: '  silk  ' }).search).toBe('silk');
  });

  it('does not search for a single letter', () => {
    expect(shopQuery({ search: 'a' }).search).toBeUndefined();
    expect(shopQuery({ search: ' k ' }).search).toBeUndefined();
    expect(shopQuery({ search: 'ik' }).search).toBe('ik');
  });

  it('sends every filter, with the price limits turned into paise', () => {
    const q = shopQuery({ filters: filters({ fabric: 'Pure Silk', weaveMethod: 'Bomkai', color: 'Maroon', minRupees: '2,000', maxRupees: '5000' }) });
    expect(q).toEqual({
      limit: '20', sortBy: 'newest', fabric: 'Pure Silk', weaveMethod: 'Bomkai', color: 'Maroon', minPrice: '200000', maxPrice: '500000',
    });
  });

  it('sends only the price limit that was typed', () => {
    expect(shopQuery({ filters: filters({ minRupees: '1500' }) }).minPrice).toBe('150000');
    expect(shopQuery({ filters: filters({ minRupees: '1500' }) }).maxPrice).toBeUndefined();
    expect(shopQuery({ filters: filters({ maxRupees: '1500' }) }).maxPrice).toBe('150000');
    expect(shopQuery({ filters: filters({ maxRupees: '1500' }) }).minPrice).toBeUndefined();
  });

  it('does not send price limits that make no sense (lowest above highest, not a number)', () => {
    const backwards = shopQuery({ filters: filters({ minRupees: '5000', maxRupees: '2000', fabric: 'Pure Silk' }) });
    expect(backwards.minPrice).toBeUndefined();
    expect(backwards.maxPrice).toBeUndefined();
    expect(backwards.fabric).toBe('Pure Silk'); // the other filters still apply
    expect(shopQuery({ filters: filters({ minRupees: 'abc' }) }).minPrice).toBeUndefined();
  });

  it('every sort in the menu is one the API understands', () => {
    // the API accepts newest, price_asc, price_desc (ProductSortBy in packages/shared)
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['newest', 'price_asc', 'price_desc']);
  });

  it('names each sort for the menu, newest first as the default', () => {
    expect(SORT_OPTIONS.map((o) => o.label)).toEqual(['Newest', 'Price: low to high', 'Price: high to low']);
    expect(sortLabel('price_desc')).toBe('Price: high to low');
    expect(sortLabel('nonsense' as any)).toBe('Newest');
  });
});

describe('effectiveSearch', () => {
  it('is the trimmed text from 2 letters up, otherwise empty', () => {
    expect(effectiveSearch('  pasapalli ')).toBe('pasapalli');
    expect(effectiveSearch('p')).toBe('');
    expect(effectiveSearch('   ')).toBe('');
    expect(effectiveSearch(undefined)).toBe('');
  });
});

describe('price limits', () => {
  it('reads whole rupees however they are typed', () => {
    expect(parseRupees('2000')).toBe(2000);
    expect(parseRupees(' 2,000 ')).toBe(2000);
    expect(parseRupees('₹5,500')).toBe(5500);
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('12.5')).toBeNull();
    expect(parseRupees('-5')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
    expect(parseRupees('99999999999')).toBeNull();
  });

  it('explains a limit that cannot be used, and accepts a good range or none', () => {
    expect(priceRangeError(filters({ minRupees: '5000', maxRupees: '2000' }))).toMatch(/more than/);
    expect(priceRangeError(filters({ minRupees: 'abc' }))).toMatch(/lowest price/);
    expect(priceRangeError(filters({ maxRupees: '1.5' }))).toMatch(/highest price/);
    expect(priceRangeError(filters({ minRupees: '2000', maxRupees: '2000' }))).toBeNull();
    expect(priceRangeError(filters({ minRupees: '2000' }))).toBeNull();
    expect(priceRangeError(NO_FILTERS)).toBeNull();
  });
});

describe('filter chips', () => {
  it('shows one chip per filter that is on, with a readable price', () => {
    expect(filterChips(filters({ fabric: 'Pure Silk', color: 'Maroon', minRupees: '2000', maxRupees: '5000' })).map((c) => c.label))
      .toEqual(['Pure Silk', 'Maroon', '₹2,000 to ₹5,000']);
    expect(filterChips(filters({ minRupees: '2000' })).map((c) => c.label)).toEqual(['From ₹2,000']);
    expect(filterChips(filters({ maxRupees: '12000' })).map((c) => c.label)).toEqual(['Up to ₹12,000']);
    expect(filterChips(NO_FILTERS)).toEqual([]);
  });

  it('counts the filters that are on (a price range is one filter)', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount(filters({ fabric: 'Pure Silk', minRupees: '1', maxRupees: '9' }))).toBe(2);
  });

  it('does not count or show a price range that cannot be used', () => {
    expect(activeFilterCount(filters({ minRupees: '5000', maxRupees: '2000' }))).toBe(0);
  });

  it('removing a chip switches only that filter off', () => {
    const f = filters({ fabric: 'Pure Silk', color: 'Maroon', minRupees: '2000', maxRupees: '5000' });
    expect(removeFilter(f, 'fabric')).toEqual({ ...f, fabric: null });
    expect(removeFilter(f, 'color')).toEqual({ ...f, color: null });
    expect(removeFilter(f, 'price')).toEqual({ ...f, minRupees: '', maxRupees: '' });
    expect(f.fabric).toBe('Pure Silk'); // the original is untouched
  });
});

describe('loading more sarees', () => {
  it('adds the next page after the ones shown and never shows a saree twice', () => {
    const shown = [{ id: 'a' }, { id: 'b' }];
    expect(appendUnique(shown, [{ id: 'b' }, { id: 'c' }]).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
