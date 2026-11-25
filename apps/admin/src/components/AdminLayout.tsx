'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { api } from '../services/api';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    api.getMe().then((user) => {
      if (user.type !== 'admin') {
        api.clearToken();
        router.push('/login');
      } else {
        setAuthed(true);
      }
    }).catch(() => {
      api.clearToken();
      router.push('/login');
    });
  }, [router]);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [title]);

  if (!authed) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              className={styles.hamburger}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className={styles.titleArea}>
              <h1 className={styles.pageTitle}>{title}</h1>
              {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
            </div>
          </div>
          <div className={styles.actions}>
            {actions}
            <ThemeToggle />
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
