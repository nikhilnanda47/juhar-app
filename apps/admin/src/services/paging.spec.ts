import { appendUnique, loadAtLeast, Page } from './paging';

const row = (id: string) => ({ id });

/** A fake list of `n` rows, served in pages like the API does (cursor = id of the last row). */
function list(n: number) {
  const all = Array.from({ length: n }, (_, i) => row(`r${String(i).padStart(3, '0')}`));
  const calls: { cursor?: string; limit: number }[] = [];
  const fetchPage = async (cursor: string | undefined, limit: number): Promise<Page<{ id: string }>> => {
    calls.push({ cursor, limit });
    const start = cursor ? all.findIndex((r) => r.id === cursor) + 1 : 0;
    const items = all.slice(start, start + limit);
    const hasMore = start + limit < all.length;
    return { items, cursor: hasMore ? items[items.length - 1].id : null, hasMore };
  };
  return { all, calls, fetchPage };
}

describe('appendUnique', () => {
  it('adds new rows after the ones shown, in order', () => {
    expect(appendUnique([row('a'), row('b')], [row('c'), row('d')]).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips a row that is already shown (a page that overlaps)', () => {
    expect(appendUnique([row('a'), row('b')], [row('b'), row('c')]).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not change the rows already shown', () => {
    const shown = [row('a')];
    appendUnique(shown, [row('b')]);
    expect(shown).toEqual([row('a')]);
  });
});

describe('loadAtLeast', () => {
  it('re-reads exactly as many rows as were showing, beyond the first page', async () => {
    const { fetchPage, all } = list(130);
    const page = await loadAtLeast(fetchPage, 60);
    expect(page.items.map((r) => r.id)).toEqual(all.slice(0, 60).map((r) => r.id));
    expect(page.hasMore).toBe(true);
    expect(page.cursor).toBe(all[59].id); // Load more continues from row 61
  });

  it('asks for the biggest page it may, and only as many rows as needed', async () => {
    const { fetchPage, calls } = list(130);
    await loadAtLeast(fetchPage, 60);
    expect(calls).toEqual([{ cursor: undefined, limit: 50 }, { cursor: 'r049', limit: 10 }]);
  });

  it('stops when the list ends and says there is no more', async () => {
    const { fetchPage } = list(7);
    const page = await loadAtLeast(fetchPage, 60);
    expect(page.items).toHaveLength(7);
    expect(page.hasMore).toBe(false);
    expect(page.cursor).toBeNull();
  });

  it('an empty list gives an empty page', async () => {
    const page = await loadAtLeast(list(0).fetchPage, 20);
    expect(page).toEqual({ items: [], cursor: null, hasMore: false });
  });

  it('shows at least one row even when asked for none', async () => {
    const { fetchPage, calls } = list(5);
    const page = await loadAtLeast(fetchPage, 0);
    expect(page.items).toHaveLength(1);
    expect(calls[0].limit).toBe(1);
  });

  it('does not repeat a row if the list changed while it was reading', async () => {
    const { all } = list(10);
    let call = 0;
    const fetchPage = async (_c: string | undefined, _l: number): Promise<Page<{ id: string }>> => {
      call++;
      return call === 1
        ? { items: all.slice(0, 3), cursor: 'r002', hasMore: true }
        : { items: all.slice(2, 6), cursor: null, hasMore: false }; // overlaps r002
    };
    const page = await loadAtLeast(fetchPage, 10);
    expect(page.items.map((r) => r.id)).toEqual(['r000', 'r001', 'r002', 'r003', 'r004', 'r005']);
  });
});
