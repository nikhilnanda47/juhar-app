'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { api } from '../services/api';
import styles from './page.module.css';

interface DashboardStats {
  todaysOrders: number;
  pendingConfirmation: number;
  lowStockItems: number;
  gmvTodayPaise: number;
  recentOrders: any[];
}

function formatPaise(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

const STAT_CARDS = [
  { key: 'todaysOrders', label: "Today's Orders", accent: 'blue', icon: '📄' },
  { key: 'pendingConfirmation', label: 'Pending', accent: 'amber', icon: '⏳' },
  { key: 'lowStockItems', label: 'Low Stock', accent: 'error', icon: '⚠️' },
  { key: 'gmvTodayPaise', label: 'GMV Today', accent: 'green', icon: '💰' },
] as const;

const STATUS_CLASS_MAP: Record<string, string> = {
  placed: 'statusPlaced',
  confirmed: 'statusConfirmed',
  packed: 'statusPacked',
  shipped: 'statusShipped',
  delivered: 'statusDelivered',
  cancelled: 'statusCancelled',
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todaysOrders: 0,
    pendingConfirmation: 0,
    lowStockItems: 0,
    gmvTodayPaise: 0,
    recentOrders: [],
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const allOrders = await api.getOrders();
      const orders = allOrders.items || [];

      const today = new Date().toDateString();
      const todaysOrders = orders.filter(
        (o: any) => new Date(o.createdAt).toDateString() === today,
      );
      const pendingConfirmation = orders.filter(
        (o: any) => o.status === 'placed',
      ).length;
      const gmvTodayPaise = todaysOrders.reduce(
        (sum: number, o: any) => sum + (o.totalPaise || 0), 0,
      );

      const products = await api.getProducts();
      let lowStock = 0;
      (products.items || []).forEach((p: any) => {
        (p.variants || []).forEach((v: any) => {
          const available = v.inventory?.available ?? v.inventory?.onHand ?? 0;
          if (available > 0 && available <= 3) lowStock++;
        });
      });

      setStats({
        todaysOrders: todaysOrders.length,
        pendingConfirmation,
        lowStockItems: lowStock,
        gmvTodayPaise,
        recentOrders: orders.slice(0, 5),
      });
    } catch {}
    setLoading(false);
  };

  const formatStatValue = (key: string, stats: DashboardStats): string => {
    if (key === 'gmvTodayPaise') return formatPaise(stats.gmvTodayPaise);
    return String(stats[key as keyof DashboardStats]);
  };

  return (
    <AdminLayout title="Dashboard" subtitle="Overview">
      {loading ? (
        <div className={styles.loadingContent}>Loading dashboard...</div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className={styles.statCard}
                data-accent={card.accent}
              >
                <div className={styles.statCardInner}>
                  <div
                    className={styles.statIcon}
                    data-accent={card.accent}
                  >
                    <span>{card.icon}</span>
                  </div>
                  <div className={styles.statText}>
                    <span className={styles.statLabel}>{card.label}</span>
                    <span className={styles.statValue}>
                      {formatStatValue(card.key, stats)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {stats.recentOrders.length > 0 && (
            <div className={styles.recentSection}>
              <h3 className={styles.sectionTitle}>Recent Orders</h3>
              <div className={styles.tableCard}>
                <table className={styles.recentTable}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((order: any) => (
                      <tr key={order.id}>
                        <td className={styles.mono}>{order.publicNumber}</td>
                        <td>{order.customer?.name || order.customer?.phone || '—'}</td>
                        <td>{formatPaise(order.totalPaise)}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${styles[STATUS_CLASS_MAP[order.status] || 'statusDefault']}`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
