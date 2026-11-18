'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
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
  const [variants, setVariants] = useState<VariantStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const products = await api.getProducts();
      const items: VariantStock[] = [];
      (products.items || []).forEach((p: any) => {
        (p.variants || []).forEach((v: any) => {
          const inv = v.inventory || {};
          items.push({
            variantId: v.id,
            sku: v.sku,
            color: v.color,
            name: v.name,
            productTitle: p.title,
            onHand: inv.onHand ?? 0,
            reserved: inv.reserved ?? 0,
            available: (inv.onHand ?? 0) - (inv.reserved ?? 0) - (inv.unavailable ?? 0),
          });
        });
      });
      setVariants(items);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loadingText}>Loading...</div>;

  return (
    <AdminLayout title="Inventory" subtitle={`${variants.length} variants`}>
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
                  <span className={v.available <= 0 ? styles.stockOut : v.available <= 3 ? styles.stockLow : styles.stockOk}>
                    {v.available}
                  </span>
                </td>
                <td>
                  {v.available <= 0 ? (
                    <span className={styles.badgeOut}>OUT OF STOCK</span>
                  ) : v.available <= 3 ? (
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
    </AdminLayout>
  );
}
