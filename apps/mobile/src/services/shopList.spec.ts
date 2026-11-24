import { SORT_OPTIONS, shopQuery, sortLabel } from './shopList';
import { appendUnique } from './paging';

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
    expect(shopQuery({ sort: 'price_desc', categoryId: 'cat-1', cursor: 'abc' })).toEqual({
      limit: '20', sortBy: 'price_desc', categoryId: 'cat-1', cursor: 'abc',
    });
  });

  it('leaves out an empty category, a blank search and no cursor, and trims the search', () => {
    expect(shopQuery({ categoryId: null, search: '   ', cursor: null })).toEqual({ limit: '20', sortBy: 'newest' });
    expect(shopQuery({ search: '  silk  ' }).search).toBe('silk');
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

describe('loading more sarees', () => {
  it('adds the next page after the ones shown and never shows a saree twice', () => {
    const shown = [{ id: 'a' }, { id: 'b' }];
    expect(appendUnique(shown, [{ id: 'b' }, { id: 'c' }]).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
