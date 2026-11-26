// What a link to a saree looks like when it is pasted into WhatsApp or a social post: a title, a short line and the
// first photo. Chat apps read these tags from the page's HTML without running any script, so the saree page's own
// layout (a server component) builds them from the API, instead of the page (which draws itself in the browser).
import type { Metadata } from 'next';

interface MetaProduct {
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  media?: { type: string; url: string; altText?: string | null; width?: number | null; height?: number | null }[];
}

const SITE = 'Juhar';

/** One line for the preview: the short description, else the start of the long one, trimmed at a word. */
export function previewLine(product: MetaProduct, max = 160): string {
  const text = (product.shortDescription || product.description || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'A handwoven Sambalpuri saree, direct from the weavers of Western Odisha.';
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 40))}…`;
}

export function productMetadata(product: MetaProduct | null | undefined): Metadata {
  if (!product) return { title: `${SITE} — Sambalpuri Handloom Sarees` };
  const title = `${product.title} — ${SITE}`;
  const description = previewLine(product);
  const cover = (product.media ?? []).find((m) => m.type === 'image');
  const images = cover
    ? [{ url: cover.url, alt: cover.altText || product.title, ...(cover.width && cover.height ? { width: cover.width, height: cover.height } : {}) }]
    : undefined;
  return {
    title,
    description,
    openGraph: { title, description, siteName: SITE, type: 'website', ...(images ? { images } : {}) },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, ...(images ? { images: [images[0].url] } : {}) },
  };
}
