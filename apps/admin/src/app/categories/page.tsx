'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';
import styles from './categories.module.css';
import { useOnMount } from '../../lib/hooks';

interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // the first load, once, when the page opens
  useOnMount(() => {
    loadCategories();
  });

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createCategory(formData);
      setFormData({ name: '', description: '', sortOrder: 0 });
      setShowForm(false);
      await loadCategories();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    await api.updateCategory(cat.id, { active: !cat.active });
    await loadCategories();
  };

  const addButton = (
    <button
      className={showForm ? styles.cancelBtn : styles.addBtn}
      onClick={() => setShowForm(!showForm)}
    >
      {showForm ? 'Cancel' : '+ Add Category'}
    </button>
  );

  if (loading) return <div className={styles.loadingText}>Loading...</div>;

  return (
    <AdminLayout title="Categories" actions={addButton}>
      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>New Category</h3>
          <form onSubmit={handleCreate}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input
                  className={styles.input}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Heritage"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sort Order</label>
                <input
                  className={styles.input}
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <input
                className={styles.input}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.saveBtn} type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Create Category'}
            </button>
          </form>
        </div>
      )}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className={styles.orderCell}>{cat.sortOrder}</td>
                <td><strong>{cat.name}</strong></td>
                <td className={styles.slug}>{cat.slug}</td>
                <td className={styles.desc}>{cat.description || '—'}</td>
                <td>
                  <span className={cat.active ? styles.badgeActive : styles.badgeInactive}>
                    {cat.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className={styles.toggleBtn} onClick={() => toggleActive(cat)}>
                    {cat.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>No categories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
