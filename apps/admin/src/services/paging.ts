// Helpers for lists that load a page at a time ("Load more").

export interface Page<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
}

/** Adds the next page to the rows already shown, skipping any row that is already there. */
export function appendUnique<T extends { id: string }>(shown: T[], incoming: T[]): T[] {
  const seen = new Set(shown.map((row) => row.id));
  return [...shown, ...incoming.filter((row) => !seen.has(row.id))];
}

/**
 * Re-reads a list the admin has already paged through (after confirming an order, say) so the
 * page keeps showing the same number of rows instead of jumping back to the first 20.
 * Reads pages until at least `minRows` are loaded or the list ends, and returns them as one page.
 */
export async function loadAtLeast<T extends { id: string }>(
  fetchPage: (cursor: string | undefined, limit: number) => Promise<Page<T>>,
  minRows: number,
  pageSize = 50,
): Promise<Page<T>> {
  let rows: T[] = [];
  let cursor: string | undefined;
  let hasMore = false;
  let next: string | null = null;
  for (let guard = 0; guard < 100; guard++) {
    const page = await fetchPage(cursor, Math.min(pageSize, Math.max(minRows - rows.length, 1)));
    rows = appendUnique(rows, page.items);
    hasMore = page.hasMore;
    next = page.cursor;
    if (!hasMore || rows.length >= minRows || !next) break;
    cursor = next;
  }
  return { items: rows, cursor: next, hasMore };
}
