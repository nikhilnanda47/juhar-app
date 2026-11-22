'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data.items || []);
    } catch {
      // AdminLayout handles auth
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (product: Product) => {
    const newStatus = product.publishStatus === 'published' ? 'draft' : 'published';
    await api.updateProduct(product.id, { publishStatus: newStatus });
    await loadProducts();
  };

  const filtered = filter === 'all'
    ? products
    : products.filter((p) => p.publishStatus === filter);

  const addButton = (
    <button className={styles.addBtn} onClick={() => router.push('/catalog/new')}>
      + Add Product
    </button>
  );

  return (
    <AdminLayout
      title="Product Catalog"
      subtitle={`${products.length} products`}
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
    </AdminLayout>
  );
}
