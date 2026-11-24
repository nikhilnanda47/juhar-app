// What the Shop screen asks the API for: the sort menu and the request parameters.

export type ShopSort = 'newest' | 'price_asc' | 'price_desc';

export const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const SHOP_PAGE_SIZE = 20;

export function sortLabel(sort: ShopSort): string {
  return SORT_OPTIONS.find((o) => o.value === sort)?.label ?? SORT_OPTIONS[0].label;
}

/** The query parameters for one page of the Shop list. Empty filters are left out. */
export function shopQuery(options: {
  categoryId?: string | null;
  search?: string;
  sort?: ShopSort;
  cursor?: string | null;
  limit?: number;
}): Record<string, string> {
  const params: Record<string, string> = {
    limit: String(options.limit ?? SHOP_PAGE_SIZE),
    sortBy: options.sort ?? 'newest',
  };
  if (options.categoryId) params.categoryId = options.categoryId;
  const search = options.search?.trim();
  if (search) params.search = search;
  if (options.cursor) params.cursor = options.cursor;
  return params;
}
