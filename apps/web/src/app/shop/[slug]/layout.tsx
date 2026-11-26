import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { productMetadata } from '@/lib/product-metadata';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// The saree page draws itself in the browser, but chat apps and search engines only read the HTML they are sent.
// This layout runs on the server to put the saree's own title, line and first photo in it (a preview when pasted).
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${encodeURIComponent(params.slug)}`, { next: { revalidate: 300 } });
    if (!res.ok) return productMetadata(null);
    const body = await res.json();
    return productMetadata(body?.data ?? body);
  } catch {
    return productMetadata(null); // the API being down must not break the page
  }
}

export default function ShopSlugLayout({ children }: { children: ReactNode }) {
  return children;
}
