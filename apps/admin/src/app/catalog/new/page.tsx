'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import { api } from '../../../services/api';
import styles from './new.module.css';

interface Category {
  id: string;
  name: string;
}

interface VariantForm {
  sku: string;
  name: string;
  color: string;
  pricePaise: string;
  compareAtPaise: string;
  initialStock: string;
}

const emptyVariant = (): VariantForm => ({
  sku: '',
  name: '',
  color: '',
  pricePaise: '',
  compareAtPaise: '',
  initialStock: '',
});

function formatPreviewPrice(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(0);

  // Product fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published'>('draft');

  // Fabric metadata
  const [fabric, setFabric] = useState('');
  const [weaveMethod, setWeaveMethod] = useState('');
  const [origin, setOrigin] = useState('');
  const [careInstructions, setCareInstructions] = useState('');
  const [blousePiece, setBlousePiece] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [weight, setWeight] = useState('');
  const [occasion, setOccasion] = useState('');
  const [tags, setTags] = useState('');

  // Variants
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const updateVariant = (index: number, field: keyof VariantForm, value: string) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const addVariant = () => setVariants((prev) => [...prev, emptyVariant()]);

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        title,
        categoryId,
        publishStatus,
        variants: variants.map((v) => ({
          sku: v.sku,
          name: v.name || undefined,
          color: v.color || undefined,
          pricePaise: Math.round(parseFloat(v.pricePaise) * 100),
          compareAtPaise: v.compareAtPaise
            ? Math.round(parseFloat(v.compareAtPaise) * 100)
            : undefined,
          initialStock: parseInt(v.initialStock) || 0,
        })),
      };

      if (description) body.description = description;
      if (shortDescription) body.shortDescription = shortDescription;
      if (fabric) body.fabric = fabric;
      if (weaveMethod) body.weaveMethod = weaveMethod;
      if (origin) body.origin = origin;
      if (careInstructions) body.careInstructions = careInstructions;
      if (blousePiece) body.blousePiece = blousePiece;
      if (length) body.length = length;
      if (width) body.width = width;
      if (weight) body.weight = weight;
      if (occasion.trim()) body.occasion = occasion.split(',').map((s) => s.trim()).filter(Boolean);
      if (tags.trim()) body.tags = tags.split(',').map((s) => s.trim()).filter(Boolean);

      await api.createProduct(body);
      router.push('/catalog');
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const occasionTags = occasion.split(',').map((s) => s.trim()).filter(Boolean);
  const tagsList = tags.split(',').map((s) => s.trim()).filter(Boolean);

  // Completion tracking
  const basicComplete = !!title && !!categoryId;
  const variantsComplete = variants.length > 0 && variants.every((v) => v.sku && v.pricePaise);
  const fabricFilled = [fabric, weaveMethod, origin].filter(Boolean).length;

  const backButton = (
    <button className={styles.backBtn} onClick={() => router.push('/catalog')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to Catalog
    </button>
  );

  return (
    <AdminLayout title="Create Product" actions={backButton}>
      <form className={styles.pageLayout} onSubmit={handleSubmit}>
        {/* Main Form Column */}
        <div className={styles.formColumn}>

          {/* Section 1: Basic Information */}
          <section
            className={`${styles.section} ${activeSection === 0 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(0)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {basicComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '1'}
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Basic Information</h3>
                <p className={styles.sectionDesc}>Product name, category, and description</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.formGroup}>
                <label>Product Title <span className={styles.required}>*</span></label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sambalpuri Ikat Silk Saree – Maroon & Gold"
                  required
                  className={styles.inputLg}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Short Description</label>
                <input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="One-liner for product cards (max 500 chars)"
                  maxLength={500}
                />
                <span className={styles.charCount}>{shortDescription.length}/500</span>
              </div>
              <div className={styles.formGroup}>
                <label>Full Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed product description — fabric story, craftsmanship, styling tips..."
                  rows={5}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category <span className={styles.required}>*</span></label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Visibility</label>
                  <div className={styles.toggleWrapper}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${publishStatus === 'draft' ? styles.toggleActive : ''}`}
                      onClick={() => setPublishStatus('draft')}
                    >
                      <span className={styles.toggleDot} style={{ background: '#F59E0B' }} />
                      Draft
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${publishStatus === 'published' ? styles.toggleActive : ''}`}
                      onClick={() => setPublishStatus('published')}
                    >
                      <span className={styles.toggleDot} style={{ background: '#10B981' }} />
                      Published
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Fabric & Craft */}
          <section
            className={`${styles.section} ${activeSection === 1 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(1)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {fabricFilled >= 2 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '2'}
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Fabric & Craft Details</h3>
                <p className={styles.sectionDesc}>Material, weave technique, and dimensions</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.formGrid3}>
                <div className={styles.formGroup}>
                  <label>Fabric</label>
                  <input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Pure Silk" />
                </div>
                <div className={styles.formGroup}>
                  <label>Weave Method</label>
                  <input value={weaveMethod} onChange={(e) => setWeaveMethod(e.target.value)} placeholder="Handloom Ikat" />
                </div>
                <div className={styles.formGroup}>
                  <label>Origin</label>
                  <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Sonepur, Odisha" />
                </div>
              </div>
              <div className={styles.formGrid3}>
                <div className={styles.formGroup}>
                  <label>Length</label>
                  <input value={length} onChange={(e) => setLength(e.target.value)} placeholder="5.5 meters" />
                </div>
                <div className={styles.formGroup}>
                  <label>Width</label>
                  <input value={width} onChange={(e) => setWidth(e.target.value)} placeholder="46 inches" />
                </div>
                <div className={styles.formGroup}>
                  <label>Weight</label>
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="450 grams" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Blouse Piece</label>
                  <input value={blousePiece} onChange={(e) => setBlousePiece(e.target.value)} placeholder="Included – 0.8m unstitched" />
                </div>
                <div className={styles.formGroup}>
                  <label>Care Instructions</label>
                  <input value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} placeholder="Dry clean only" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Occasion</label>
                  <input value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Festive, Wedding, Party" />
                  {occasionTags.length > 0 && (
                    <div className={styles.chipRow}>
                      {occasionTags.map((t, i) => (
                        <span key={i} className={styles.chip}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Tags</label>
                  <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="silk, ikat, bapta" />
                  {tagsList.length > 0 && (
                    <div className={styles.chipRow}>
                      {tagsList.map((t, i) => (
                        <span key={i} className={styles.chipAlt}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Variants */}
          <section
            className={`${styles.section} ${activeSection === 2 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(2)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {variantsComplete ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '3'}
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Pricing & Variants</h3>
                <p className={styles.sectionDesc}>SKU, pricing, and stock for each variant</p>
              </div>
              <button type="button" className={styles.addVariantBtn} onClick={addVariant}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Variant
              </button>
            </div>
            <div className={styles.sectionBody}>
              {variants.map((variant, idx) => (
                <div key={idx} className={styles.variantCard}>
                  <div className={styles.variantTop}>
                    <div className={styles.variantBadge}>
                      {variant.color && (
                        <span
                          className={styles.colorDot}
                          style={{ background: variant.color.toLowerCase() }}
                        />
                      )}
                      Variant {idx + 1}
                    </div>
                    {variants.length > 1 && (
                      <button type="button" className={styles.removeBtn} onClick={() => removeVariant(idx)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className={styles.variantGrid}>
                    <div className={styles.formGroup}>
                      <label>SKU <span className={styles.required}>*</span></label>
                      <input
                        value={variant.sku}
                        onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                        placeholder="JUH-IKT-MRN-001"
                        required
                        className={styles.inputMono}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Variant Name</label>
                      <input
                        value={variant.name}
                        onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                        placeholder="Maroon with Gold Border"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Color</label>
                      <input
                        value={variant.color}
                        onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                        placeholder="Maroon"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Price (₹) <span className={styles.required}>*</span></label>
                      <div className={styles.inputWithPrefix}>
                        <span className={styles.inputPrefix}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={variant.pricePaise}
                          onChange={(e) => updateVariant(idx, 'pricePaise', e.target.value)}
                          placeholder="3,500"
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Compare Price (₹)</label>
                      <div className={styles.inputWithPrefix}>
                        <span className={styles.inputPrefix}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={variant.compareAtPaise}
                          onChange={(e) => updateVariant(idx, 'compareAtPaise', e.target.value)}
                          placeholder="4,500"
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Stock <span className={styles.required}>*</span></label>
                      <input
                        type="number"
                        min="0"
                        value={variant.initialStock}
                        onChange={(e) => updateVariant(idx, 'initialStock', e.target.value)}
                        placeholder="5"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className={styles.errorCard}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Sidebar Preview */}
        <div className={styles.sideColumn}>
          <div className={styles.previewCard}>
            <h4 className={styles.previewTitle}>Product Preview</h4>

            <div className={styles.previewImagePlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>No images yet</span>
            </div>

            <div className={styles.previewName}>{title || 'Product Title'}</div>
            {shortDescription && (
              <p className={styles.previewDesc}>{shortDescription}</p>
            )}

            <div className={styles.previewMeta}>
              {selectedCategory && (
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewLabel}>Category</span>
                  <span className={styles.previewValue}>{selectedCategory.name}</span>
                </div>
              )}
              {fabric && (
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewLabel}>Fabric</span>
                  <span className={styles.previewValue}>{fabric}</span>
                </div>
              )}
              {weaveMethod && (
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewLabel}>Weave</span>
                  <span className={styles.previewValue}>{weaveMethod}</span>
                </div>
              )}
              {origin && (
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewLabel}>Origin</span>
                  <span className={styles.previewValue}>{origin}</span>
                </div>
              )}
            </div>

            {variants.some((v) => v.pricePaise) && (
              <>
                <div className={styles.previewDivider} />
                <div className={styles.previewLabel}>Variants & Pricing</div>
                <div className={styles.previewVariants}>
                  {variants.map((v, i) => (
                    v.pricePaise ? (
                      <div key={i} className={styles.previewVariantRow}>
                        <div className={styles.previewVariantInfo}>
                          {v.color && (
                            <span
                              className={styles.colorDotSm}
                              style={{ background: v.color.toLowerCase() }}
                            />
                          )}
                          <span>{v.name || v.sku || `Variant ${i + 1}`}</span>
                        </div>
                        <div className={styles.previewVariantPrice}>
                          {v.compareAtPaise && (
                            <span className={styles.previewStrikePrice}>
                              {formatPreviewPrice(v.compareAtPaise)}
                            </span>
                          )}
                          <span className={styles.previewMainPrice}>
                            {formatPreviewPrice(v.pricePaise)}
                          </span>
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Card */}
          <div className={styles.statusCard}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Status</span>
              <span className={publishStatus === 'published' ? styles.statusPublished : styles.statusDraft}>
                {publishStatus === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Variants</span>
              <span className={styles.statusValue}>{variants.length}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Total Stock</span>
              <span className={styles.statusValue}>
                {variants.reduce((s, v) => s + (parseInt(v.initialStock) || 0), 0)}
              </span>
            </div>

            <div className={styles.statusDivider} />

            <div className={styles.completionSection}>
              <span className={styles.completionLabel}>Completion</span>
              <div className={styles.completionBar}>
                <div
                  className={styles.completionFill}
                  style={{ width: `${((basicComplete ? 1 : 0) + (fabricFilled >= 2 ? 1 : 0) + (variantsComplete ? 1 : 0)) / 3 * 100}%` }}
                />
              </div>
              <div className={styles.completionChecks}>
                <div className={basicComplete ? styles.checkDone : styles.checkPending}>
                  {basicComplete ? '✓' : '○'} Basic Info
                </div>
                <div className={fabricFilled >= 2 ? styles.checkDone : styles.checkPending}>
                  {fabricFilled >= 2 ? '✓' : '○'} Fabric Details
                </div>
                <div className={variantsComplete ? styles.checkDone : styles.checkPending}>
                  {variantsComplete ? '✓' : '○'} Pricing & Variants
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.bottomBarInner}>
            <button type="button" className={styles.cancelBtn} onClick={() => router.push('/catalog')}>
              Cancel
            </button>
            <div className={styles.bottomRight}>
              <button
                type="submit"
                className={styles.saveDraftBtn}
                disabled={saving}
                onClick={() => setPublishStatus('draft')}
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className={styles.publishBtn}
                disabled={saving}
                onClick={() => setPublishStatus('published')}
              >
                {saving ? (
                  <>
                    <span className={styles.btnSpinner} />
                    Creating...
                  </>
                ) : (
                  'Create & Publish'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
