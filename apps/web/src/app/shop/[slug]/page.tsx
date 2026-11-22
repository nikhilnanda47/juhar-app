'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Heart, Share2, Check, CheckCircle, Zap, Package, RefreshCw,
  Banknote, ShieldCheck, Truck, Star, MapPin,
} from 'lucide-react';
import { getProductBySlug, getProducts, formatPaise, isLoggedIn, addToCart, type Product, type ProductVariant } from '@/lib/api';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinChecked, setPinChecked] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (slug) {
      getProductBySlug(slug).then((p) => {
        setProduct(p);
        setSelectedVariant(p.variants[0] || null);
        // Fetch related
        getProducts({ limit: '4', sortBy: 'newest' }).then(d => {
          setRelatedProducts(d.items.filter(item => item.slug !== slug).slice(0, 4));
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [slug]);

  // Reset addedToCart when slug changes (navigating to different product)
  useEffect(() => {
    setAddedToCart(false);
  }, [slug]);

  const handleAddToCart = async () => {
    if (!selectedVariant || !product) return;
    setAddingToCart(true);
    try {
      if (isLoggedIn()) {
        await addToCart(selectedVariant.id, 1);
      } else {
        const localCart = JSON.parse(localStorage.getItem('juhar_local_cart') || '[]');
        const existing = localCart.find((c: any) => c.variantId === selectedVariant.id);
        if (existing) { existing.quantity += 1; }
        else {
          localCart.push({
            variantId: selectedVariant.id, quantity: 1,
            productTitle: product.title, productSlug: product.slug,
            variantName: selectedVariant.name, color: selectedVariant.color,
            sku: selectedVariant.sku, pricePaise: selectedVariant.pricePaise,
            compareAtPaise: selectedVariant.compareAtPaise, available: selectedVariant.available,
          });
        }
        localStorage.setItem('juhar_local_cart', JSON.stringify(localCart));
      }
      setAddedToCart(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch {}
    setAddingToCart(false);
  };

  if (!product) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const stock = selectedVariant?.available ?? 0;
  const discount = selectedVariant?.compareAtPaise && selectedVariant.compareAtPaise > selectedVariant.pricePaise
    ? Math.round((1 - selectedVariant.pricePaise / selectedVariant.compareAtPaise) * 100)
    : null;

  return (
    <>
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-[slideDown_0.3s_ease] bg-toast-bg text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-semibold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Added to bag!
        </div>
      )}

      {/* Mobile back bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-surface/80 backdrop-blur-xl h-12 px-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
          <ChevronLeft size={20} className="text-text-primary" />
        </button>
        <div className="flex gap-2">
          <button onClick={() => setWishlisted(!wishlisted)} className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
            <Heart size={18} className={wishlisted ? 'text-primary fill-primary' : 'text-text-secondary'} strokeWidth={1.5} />
          </button>
          <button className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center">
            <Share2 size={18} className="text-text-secondary" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="page-container pb-24 lg:pb-10">
        {/* Desktop breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 py-4 font-sans text-body-sm text-text-tertiary">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-primary">Shop</Link>
          <span>/</span>
          <span className="text-text-primary">{product.title}</span>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[55%_45%] lg:gap-12 lg:items-start">
          {/* Left — Image gallery */}
          <div className="lg:sticky lg:top-20">
            {/* Main image */}
            <div className="relative aspect-[3/4] lg:aspect-[4/5] lg:rounded-2xl overflow-hidden bg-surface-container-low">
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-accent" strokeWidth={2} />
                <span className="font-sans text-label-sm text-text-primary font-semibold tracking-wide">GI CERTIFIED LOOM</span>
              </div>
              {/* Desktop actions */}
              <div className="hidden lg:flex absolute top-4 right-4 gap-2">
                <button onClick={() => setWishlisted(!wishlisted)}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
                  <Heart size={20} className={wishlisted ? 'text-primary fill-primary' : 'text-text-secondary'} strokeWidth={1.5} />
                </button>
                <button className="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center hover:bg-white transition-colors">
                  <Share2 size={20} className="text-text-secondary" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            {/* Thumbnail strip — desktop only */}
            <div className="hidden lg:flex gap-3 mt-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`flex-1 aspect-square rounded-xl bg-surface-container-low overflow-hidden cursor-pointer ${i === 0 ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-border'} transition-all`} />
              ))}
            </div>
          </div>

          {/* Right — Product info */}
          <div className="px-4 lg:px-0 lg:py-2">
            {/* Origin + Title */}
            <p className="label-upper text-accent mb-1 mt-4 lg:mt-0">{(product.origin || 'HANDCRAFT').toUpperCase()}</p>
            <h1 className="font-serif text-headline-lg-mobile lg:text-headline-xl text-text-primary leading-tight">{product.title}</h1>

            {stock > 0 && stock <= 3 && (
              <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full bg-error/10">
                <Zap size={12} className="text-error" />
                <span className="font-sans text-label-sm text-error font-semibold">Only {stock} left</span>
              </div>
            )}

            {/* Price */}
            {selectedVariant && (
              <div className="flex items-baseline gap-3 mt-4">
                <span className="font-sans text-[28px] lg:text-[32px] font-semibold text-text-primary tracking-tight">
                  {formatPaise(selectedVariant.pricePaise)}
                </span>
                {selectedVariant.compareAtPaise && selectedVariant.compareAtPaise > selectedVariant.pricePaise && (
                  <>
                    <span className="font-sans text-body-lg text-text-tertiary line-through">{formatPaise(selectedVariant.compareAtPaise)}</span>
                    <span className="badge bg-secondary-container text-accent text-label-md">{discount}% off</span>
                  </>
                )}
              </div>
            )}
            <p className="font-sans text-body-sm text-text-tertiary mt-1">Inclusive of all taxes and handloom cess</p>

            <div className="h-px bg-border my-5 lg:my-6" />

            {/* Colour swatches */}
            {product.variants.length > 1 && (
              <div className="mb-6">
                <p className="font-sans text-title-sm text-text-primary mb-3">
                  Colour <span className="text-text-secondary font-normal">— {selectedVariant?.color || selectedVariant?.name}</span>
                </p>
                <div className="flex gap-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-105 ${
                        selectedVariant?.id === v.id ? 'border-primary ring-2 ring-primary/20 scale-110' : 'border-border'
                      }`}
                      style={{ backgroundColor: v.color || '#D5CFC9' }}
                    >
                      {selectedVariant?.id === v.id && (
                        <Check size={16} className="text-white mx-auto" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Check Delivery */}
            <div className="mb-6">
              <p className="font-sans text-title-sm text-text-primary mb-2 flex items-center gap-2">
                <MapPin size={16} className="text-accent" strokeWidth={1.5} />
                Check Delivery
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => { setPinCode(e.target.value.replace(/\D/g, '')); setPinChecked(false); }}
                  placeholder="Enter PIN code"
                  maxLength={6}
                  className="flex-1 lg:max-w-[200px] h-11 bg-surface rounded-xl border border-border px-4 font-sans text-body-md outline-none focus:border-primary"
                />
                <button
                  onClick={() => pinCode.length === 6 && setPinChecked(true)}
                  disabled={pinCode.length < 6}
                  className="h-11 px-5 rounded-xl bg-surface-container-low font-sans text-label-md text-text-primary font-medium hover:bg-surface-container transition-colors disabled:opacity-40"
                >
                  Check
                </button>
              </div>
              {pinChecked && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" strokeWidth={2} />
                    <span className="font-sans text-body-md text-text-primary">Delivery in 5–7 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" strokeWidth={2} />
                    <span className="font-sans text-body-md text-text-primary">Cash on delivery available</span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-border mb-6" />

            {/* Add to Cart — desktop inline */}
            <div className="hidden lg:flex gap-3 mb-8">
              {addedToCart ? (
                <Link href="/cart"
                  className="flex-1 h-14 rounded-xl font-sans text-title-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-success hover:bg-success/90"
                >
                  Go to Bag →
                </Link>
              ) : (
                <button
                  onClick={handleAddToCart}
                  disabled={stock <= 0 || addingToCart}
                  className={`flex-1 h-14 rounded-xl font-sans text-title-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    stock <= 0 ? 'bg-text-tertiary opacity-40' : 'bg-primary hover:bg-primary-dark'
                  }`}
                >
                  {addingToCart ? 'Adding...' : stock > 0 ? 'Add to Bag' : 'Out of Stock'}
                </button>
              )}
              <button onClick={() => setWishlisted(!wishlisted)}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-105 ${wishlisted ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <Heart size={22} className={wishlisted ? 'text-primary fill-primary' : 'text-text-secondary'} strokeWidth={1.5} />
              </button>
            </div>

            {/* Delivery promises */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
              {[
                { icon: Package, title: 'Sacred Packaging', desc: 'Handpacked in kora cloth' },
                { icon: RefreshCw, title: 'Easy Returns', desc: '7-day hassle-free returns' },
                { icon: Banknote, title: 'Cash on Delivery', desc: 'Pay when you receive' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center lg:flex-col lg:items-center lg:text-center gap-3 lg:gap-1.5 p-3 lg:p-4 rounded-xl bg-surface-container-low/50">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-accent" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-sans text-label-md text-text-primary font-medium">{title}</p>
                    <p className="font-sans text-body-sm text-text-tertiary">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-border my-5 lg:my-6" />

            {/* Details table */}
            <h3 className="font-sans text-title-sm text-text-primary mb-3">Product Details</h3>
            <div className="card !p-0 overflow-hidden mb-6">
              {[
                ['Fabric', product.fabric],
                ['Weave Method', product.weaveMethod],
                ['Origin', product.origin],
                ['Length', product.length],
                ['Width', product.width],
                ['Weight', product.weight ? `${product.weight}g` : null],
                ['Occasion', product.occasion],
                ['Blouse Piece', product.blousePiece === true ? 'Included' : product.blousePiece === false ? 'Not included' : null],
                ['Care', product.careInstructions],
              ].filter(([, v]) => v).map(([label, value], idx) => (
                <div key={label} className={`flex justify-between py-3 px-4 ${idx % 2 === 0 ? 'bg-surface-container-low/30' : ''}`}>
                  <span className="font-sans text-body-md text-text-secondary">{label}</span>
                  <span className="font-sans text-body-md text-text-primary font-medium text-right">{value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="font-sans text-title-sm text-text-primary mb-2">About this Saree</h3>
                <p className="font-sans text-body-md text-text-secondary leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Authenticity */}
            <div className="card flex gap-3 !bg-surface-container-low/50 mb-6">
              <ShieldCheck size={20} className="text-accent shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="font-sans text-label-md text-text-primary font-medium">Authenticity Guaranteed</p>
                <p className="font-sans text-body-sm text-text-tertiary">Every saree comes with a GI weaver provenance certificate and handloom mark.</p>
              </div>
            </div>
          </div>
        </div>

        {/* You may also like */}
        {relatedProducts.length > 0 && (
          <section className="mt-10 lg:mt-16">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">You may also like</h2>
              <Link href="/shop" className="font-sans text-label-md text-primary hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
              {relatedProducts.map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="group">
                  <div className="aspect-[3/4] rounded-xl bg-surface-container-low overflow-hidden mb-2 group-hover:shadow-md transition-shadow" />
                  <p className="font-sans text-body-sm text-text-secondary">{p.origin || 'Handloom'}</p>
                  <p className="font-sans text-body-md text-text-primary font-medium truncate">{p.title}</p>
                  <span className="font-sans text-price-md text-accent">{formatPaise(p.startingPricePaise)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky Add to Cart */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-surface/95 backdrop-blur px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="flex items-center gap-3">
          <div>
            <p className="label-upper">PRICE</p>
            <p className="font-sans text-price-lg text-text-primary">{selectedVariant ? formatPaise(selectedVariant.pricePaise) : ''}</p>
          </div>
          {addedToCart ? (
            <Link href="/cart"
              className="flex-1 h-12 rounded-lg font-sans text-title-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-success hover:bg-success/90"
            >
              Go to Bag →
            </Link>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={stock <= 0 || addingToCart}
              className={`flex-1 h-12 rounded-lg font-sans text-title-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                stock <= 0 ? 'bg-text-tertiary opacity-40' : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {addingToCart ? 'Adding...' : stock > 0 ? 'Add to Bag' : 'Out of Stock'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
