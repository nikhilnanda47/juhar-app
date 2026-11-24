// What the Shop screen asks the API for: the sort menu, the filters and the request parameters.

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

// ── Search ──

/** A search shorter than this is not sent (one letter would match almost everything). */
export const MIN_SEARCH_LENGTH = 2;

/** The text to search for: trimmed, or '' when it is too short to search. */
export function effectiveSearch(text: string | undefined): string {
  const trimmed = (text ?? '').trim();
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '';
}

// ── Filters ──

export interface ShopFilters {
  fabric: string | null;
  weaveMethod: string | null;
  color: string | null;
  /** price limits as typed, in rupees ('' = no limit) */
  minRupees: string;
  maxRupees: string;
}

export const NO_FILTERS: ShopFilters = { fabric: null, weaveMethod: null, color: null, minRupees: '', maxRupees: '' };

/** Whole rupees typed by a customer ("2,000", " 5000 "), or null when empty or not a number. */
export function parseRupees(text: string): number | null {
  const digits = text.replace(/[,\s₹]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n <= 10_000_000 ? n : null;
}

/** Says what is wrong with the price limits, or null when they are fine. */
export function priceRangeError(f: ShopFilters): string | null {
  const hasMin = f.minRupees.trim() !== '';
  const hasMax = f.maxRupees.trim() !== '';
  const min = parseRupees(f.minRupees);
  const max = parseRupees(f.maxRupees);
  if (hasMin && min === null) return 'Enter the lowest price as a whole number of rupees';
  if (hasMax && max === null) return 'Enter the highest price as a whole number of rupees';
  if (min !== null && max !== null && min > max) return 'The lowest price is more than the highest price';
  return null;
}

const rupees = (n: number) => '₹' + n.toLocaleString('en-IN');

/** The filters that are switched on, as removable chips (a fabric, a colour, a price range). */
export function filterChips(f: ShopFilters): { key: keyof ShopFilters | 'price'; label: string }[] {
  const chips: { key: keyof ShopFilters | 'price'; label: string }[] = [];
  if (f.fabric) chips.push({ key: 'fabric', label: f.fabric });
  if (f.weaveMethod) chips.push({ key: 'weaveMethod', label: f.weaveMethod });
  if (f.color) chips.push({ key: 'color', label: f.color });
  if (!priceRangeError(f)) {
    const min = parseRupees(f.minRupees);
    const max = parseRupees(f.maxRupees);
    if (min !== null && max !== null) chips.push({ key: 'price', label: `${rupees(min)} to ${rupees(max)}` });
    else if (min !== null) chips.push({ key: 'price', label: `From ${rupees(min)}` });
    else if (max !== null) chips.push({ key: 'price', label: `Up to ${rupees(max)}` });
  }
  return chips;
}

export function activeFilterCount(f: ShopFilters): number {
  return filterChips(f).length;
}

/** The filters with one chip switched off. */
export function removeFilter(f: ShopFilters, key: keyof ShopFilters | 'price'): ShopFilters {
  if (key === 'price') return { ...f, minRupees: '', maxRupees: '' };
  return { ...f, [key]: key === 'minRupees' || key === 'maxRupees' ? '' : null };
}

/** The query parameters for one page of the Shop list. Empty filters are left out. */
export function shopQuery(options: {
  categoryId?: string | null;
  search?: string;
  sort?: ShopSort;
  filters?: ShopFilters;
  cursor?: string | null;
  limit?: number;
}): Record<string, string> {
  const params: Record<string, string> = {
    limit: String(options.limit ?? SHOP_PAGE_SIZE),
    sortBy: options.sort ?? 'newest',
  };
  if (options.categoryId) params.categoryId = options.categoryId;
  const search = effectiveSearch(options.search);
  if (search) params.search = search;

  const f = options.filters;
  if (f) {
    if (f.fabric) params.fabric = f.fabric;
    if (f.weaveMethod) params.weaveMethod = f.weaveMethod;
    if (f.color) params.color = f.color;
    // the API wants paise; limits that make no sense (not a number, lowest above highest) are not sent
    if (!priceRangeError(f)) {
      const min = parseRupees(f.minRupees);
      const max = parseRupees(f.maxRupees);
      if (min !== null && min > 0) params.minPrice = String(min * 100);
      if (max !== null) params.maxPrice = String(max * 100);
    }
  }
  if (options.cursor) params.cursor = options.cursor;
  return params;
}
