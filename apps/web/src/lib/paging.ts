// Helper for lists that load a page at a time ("Load more").

/** Adds the next page to the rows already shown, skipping any row that is already there. */
export function appendUnique<T extends { id: string }>(shown: T[], incoming: T[]): T[] {
  const seen = new Set(shown.map((row) => row.id));
  return [...shown, ...incoming.filter((row) => !seen.has(row.id))];
}
