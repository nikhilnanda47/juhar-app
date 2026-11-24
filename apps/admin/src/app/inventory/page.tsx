'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api, type ProductCounts } from '../../services/api';
import { appendUnique } from '../../services/paging';
import styles from './inventory.module.css';

interface VariantStock {
  variantId: string;
  sku: string;
  color: string | null;
  name: string | null;
  productTitle: string;
  onHand: number;
  reserved: number;
  available: number;
}

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [counts, setCounts] = useState<ProductCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const lowAt = counts?.lowStockThreshold ?? 3;

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const data = await api.getProducts({ limit: '20' });
      setProducts(data.items || []);
      setCursor(data.cursor);
      setHasMore(data.hasMore);
      if (data.counts) setCounts(data.counts);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError('');
    try {
      const data = await api.getProducts({ limit: '20', cursor });
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

  // One row per variant of the products loaded so far
  const variants: VariantStock[] = products.flatMap((p: any) =>
    (p.variants || []).map((v: any) => {
      const inv = v.inventory || {};
      return {
        variantId: v.id,
        sku: v.sku,
        color: v.color,
        name: v.name,
        productTitle: p.title,
        onHand: inv.onHand ?? 0,
        reserved: inv.reserved ?? 0,
        available: (inv.onHand ?? 0) - (inv.reserved ?? 0) - (inv.unavailable ?? 0),
      };
    }),
  );

  if (loading) return <div className={styles.loadingText}>Loading...</div>;

  return (
    <AdminLayout
      title="Inventory"
      subtitle={counts && counts.variants > variants.length ? `${variants.length} of ${counts.variants} variants` : `${variants.length} variants`}
    >
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Color / Variant</th>
              <th className={styles.thCenter}>On Hand</th>
              <th className={styles.thCenter}>Reserved</th>
              <th className={styles.thCenter}>Available</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.variantId}>
                <td className={styles.productName}>{v.productTitle}</td>
                <td className={styles.sku}>{v.sku}</td>
                <td>{v.color || v.name || '—'}</td>
                <td className={styles.num}>{v.onHand}</td>
                <td className={styles.num}>{v.reserved}</td>
                <td className={styles.num}>
                  <span className={v.available <= 0 ? styles.stockOut : v.available <= lowAt ? styles.stockLow : styles.stockOk}>
                    {v.available}
                  </span>
                </td>
                <td>
                  {v.available <= 0 ? (
                    <span className={styles.badgeOut}>OUT OF STOCK</span>
                  ) : v.available <= lowAt ? (
                    <span className={styles.badgeLow}>LOW STOCK</span>
                  ) : (
                    <span className={styles.badgeOk}>IN STOCK</span>
                  )}
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr><td colSpan={7} className={styles.empty}>No inventory data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {variants.length > 0 && (
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
