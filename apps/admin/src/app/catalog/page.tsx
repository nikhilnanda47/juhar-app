'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api, type ProductCounts } from '../../services/api';
import { appendUnique, loadAtLeast } from '../../services/paging';
import styles from './catalog.module.css';

interface Variant {
  id: string;
  sku: string;
  name: string | null;
  color: string | null;
  pricePaise: number;
  inventory: { onHand: number; reserved: number; unavailable: number } | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  publishStatus: string;
  category: { id: string; name: string } | null;
  fabric: string | null;
  variants: Variant[];
  createdAt: string;
}

function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [counts, setCounts] = useState<ProductCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  // Only the newest request may change the list (a slow answer for an old filter is dropped)
  const requestId = useRef(0);

  // One page of the list for the current filter. The filter is applied by the API, so it covers
  // every product, not just the ones already loaded.
  const fetchProducts = (after?: string, limit = 20) => {
    const params: Record<string, string> = { limit: String(limit) };
    if (filter !== 'all') params.publishStatus = filter;
    if (after) params.cursor = after;
    return api.getProducts(params);
  };

  const loadProducts = async () => {
    const mine = ++requestId.current;
    setLoadError('');
    try {
      const data = await fetchProducts();
      if (mine !== requestId.current) return;
      setProducts(data.items || []);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      if (data.counts) setCounts(data.counts);
    } catch {
      // AdminLayout handles auth
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProducts();
  }, [filter]);

  // Refresh after publishing or unpublishing, keeping as many rows on screen as there were
  const refreshProducts = async () => {
    const mine = ++requestId.current;
    try {
      const first = await fetchProducts(undefined, 1);
      const page = await loadAtLeast((after, limit) => fetchProducts(after, limit), Math.max(products.length, 20));
      if (mine !== requestId.current) return;
      setProducts(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      if (first.counts) setCounts(first.counts);
    } catch {
      // keep what is on screen
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const mine = requestId.current;
    setLoadingMore(true);
    setLoadError('');
    try {
      const data = await fetchProducts(cursor);
      if (mine !== requestId.current) return; // the filter changed meanwhile
      setProducts((shown) => appendUnique(shown, data.items || []));
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      if (data.counts) setCounts(data.counts);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load more products');
    } finally {
      setLoadingMore(false);
    }
  };

  const togglePublish = async (product: Product) => {
    const newStatus = product.publishStatus === 'published' ? 'draft' : 'published';
    await api.updateProduct(product.id, { publishStatus: newStatus });
    await refreshProducts();
  };

  const filtered = products;
  const countFor = (f: 'all' | 'published' | 'draft') =>
    counts ? (f === 'all' ? counts.products : counts[f]) : null;

  const addButton = (
    <button className={styles.addBtn} onClick={() => router.push('/catalog/new')}>
      + Add Product
    </button>
  );

  return (
    <AdminLayout
      title="Product Catalog"
      subtitle={counts ? `${counts.products} products` : ''}
      actions={addButton}
    >
      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          {(['all', 'published', 'draft'] as const).map((f) => (
            <button
              key={f}
              className={filter === f ? styles.filterActive : styles.filterBtn}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {countFor(f) !== null && ` (${countFor(f)})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>Loading products...</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Variants</th>
                <th>Price Range</th>
                <th>Total Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const prices = product.variants.map((v) => v.pricePaise);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const totalStock = product.variants.reduce((sum, v) => {
                  const inv = v.inventory;
                  return sum + (inv ? inv.onHand - inv.reserved - inv.unavailable : 0);
                }, 0);

                return (
                  <tr key={product.id}>
                    <td>
                      <div className={styles.productCell}>
                        <span className={styles.productTitle}>{product.title}</span>
                        <span className={styles.slug}>{product.slug}</span>
                      </div>
                    </td>
                    <td>{product.category?.name || '—'}</td>
                    <td>{product.variants.length}</td>
                    <td className={styles.price}>
                      {minPrice === maxPrice
                        ? formatPaise(minPrice)
                        : `${formatPaise(minPrice)} – ${formatPaise(maxPrice)}`}
                    </td>
                    <td>
                      <span className={totalStock <= 2 ? styles.lowStock : ''}>
                        {totalStock}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          product.publishStatus === 'published'
                            ? styles.badgePublished
                            : styles.badgeDraft
                        }
                      >
                        {product.publishStatus}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => togglePublish(product)}
                      >
                        {product.publishStatus === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    <div className={styles.emptyIcon}>&#128722;</div>
                    <div>No products found</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className={styles.loadMoreBar}>
          <span className={styles.loadMoreInfo}>
            {hasMore ? `Showing ${products.length} products` : `All ${products.length} products shown`}
          </span>
          {hasMore && (
            <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
          {loadError && <span className={styles.loadMoreError}>{loadError}</span>}
        </div>
      )}
    </AdminLayout>
  );
}
