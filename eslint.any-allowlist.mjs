// Files that still use the `any` type in their own code (tests are exempt: their fakes need it).
//
// The rule `@typescript-eslint/no-explicit-any` is ON for every other file, so new code and any file that is already
// clean cannot slip `any` back in. This list can only shrink: when you replace the `any`s in a file with real types
// (or `unknown` plus a check), delete its line here. The number after each file is how many uses it had (item 49).
// Adding a file here needs a reason in the pull request. (A folder named [id] is written with a backslash before
// each bracket, because ESLint reads square brackets in these paths as a pattern.)
export const filesStillUsingAny = [
  'apps/admin/src/app/catalog/\\[id\\]/page.tsx', // 2
  'apps/admin/src/app/catalog/new/page.tsx', // 1
  'apps/admin/src/app/catalog/page.tsx', // 1
  'apps/admin/src/app/categories/page.tsx', // 1
  'apps/admin/src/app/inventory/page.tsx', // 4
  'apps/admin/src/app/login/page.tsx', // 2
  'apps/admin/src/app/orders/\\[id\\]/page.tsx', // 1
  'apps/admin/src/app/orders/page.tsx', // 3
  'apps/admin/src/app/page.tsx', // 3
  'apps/admin/src/components/OrderActions.tsx', // 3
  'apps/admin/src/components/PhotoManager.tsx', // 2
  'apps/admin/src/components/StockAdjustModal.tsx', // 1
  'apps/admin/src/services/api.ts', // 3
  'apps/web/src/app/account/addresses/page.tsx', // 2
  'apps/web/src/app/account/page.tsx', // 4
  'apps/web/src/app/cart/page.tsx', // 7
  'apps/web/src/app/checkout/review/page.tsx', // 1
  'apps/web/src/app/order-success/page.tsx', // 1
  'apps/web/src/app/orders/\\[id\\]/page.tsx', // 3
  'apps/web/src/app/orders/page.tsx', // 3
  'apps/web/src/app/shop/\\[slug\\]/page.tsx', // 3
  'apps/web/src/app/wishlist/page.tsx', // 1
  'apps/web/src/components/AddressForm.tsx', // 2
  'apps/web/src/lib/api.ts', // 5
  'apps/web/src/lib/cart-events.ts', // 2
  'apps/web/src/lib/wishlist-refresh.ts', // 2
  'apps/web/src/lib/wishlist-state.ts', // 2
];
