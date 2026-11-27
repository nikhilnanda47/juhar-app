'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import PendingPhotos from '../../../components/PendingPhotos';
import { uploadInOrder } from '../../../lib/photos';
import { api, messageOf } from '../../../services/api';
import styles from './new.module.css';
import { BasicInfoSection, FabricSection, emptyProductFields, splitList, type ProductFields } from './ProductFields';

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
  const [photos, setPhotos] = useState<File[]>([]); // chosen here, uploaded right after the product is saved
  const coverPreview = useMemo(() => (photos[0] ? URL.createObjectURL(photos[0]) : null), [photos]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  const [uploadStep, setUploadStep] = useState<{ done: number; total: number } | null>(null);

  // Product fields (the basic information and the fabric details; the form sections are shared with the Edit page)
  const [fields, setFields] = useState<ProductFields>(emptyProductFields());
  const setField = (name: keyof ProductFields, value: string) => setFields((f) => ({ ...f, [name]: value }));
  const {
    title, description, shortDescription, categoryId, publishStatus,
    fabric, weaveMethod, origin, careInstructions, blousePiece, length, width, weight, occasion, tags,
  } = fields;

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
      if (occasion.trim()) body.occasion = splitList(occasion);
      if (tags.trim()) body.tags = splitList(tags);

      const created = await api.createProduct(body);
      // a photo needs the product to exist, so they go up now, one by one in the order chosen; one refused photo must not
      // lose the others, and the product is already saved either way
      const failed = await uploadInOrder(
        photos,
        (file) => api.uploadPhoto(created.id, file),
        (e) => messageOf(e, 'could not be uploaded.'),
        (done, total) => setUploadStep({ done, total }),
      );
      router.push(`/catalog/${created.id}?created=1${failed.length > 0 ? `&photosFailed=${failed.length}` : ''}`);
    } catch (err) {
      setError(messageOf(err, 'Failed to create product'));
    } finally {
      setSaving(false);
      setUploadStep(null);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  
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

          <BasicInfoSection
            values={fields} onChange={setField} categories={categories}
            active={activeSection === 0} onActivate={() => setActiveSection(0)} complete={basicComplete}
          />

          <FabricSection
            values={fields} onChange={setField}
            active={activeSection === 1} onActivate={() => setActiveSection(1)} complete={fabricFilled >= 2}
          />

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

          {/* Section 4: Photos (optional here; they can also be added later on the Edit page) */}
          <section
            className={`${styles.section} ${activeSection === 3 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(3)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {photos.length > 0 ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '4'}
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Photos</h3>
                <p className={styles.sectionDesc}>Optional. The first photo is the cover on the shop and in the app. They upload when you save the product.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              <PendingPhotos files={photos} onChange={setPhotos} disabled={saving} />
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

            {coverPreview ? (
              <div className={styles.previewImagePlaceholder} style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                <img src={coverPreview} alt="Cover photo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
            <div className={styles.previewImagePlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>No photo chosen yet</span>
            </div>
            )}

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
                <div className={photos.length > 0 ? styles.checkDone : styles.checkPending}>
                  {photos.length > 0 ? '✓' : '○'} Photos (optional)
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
                onClick={() => setField('publishStatus', 'draft')}
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className={styles.publishBtn}
                disabled={saving}
                onClick={() => setField('publishStatus', 'published')}
              >
                {saving ? (
                  <>
                    <span className={styles.btnSpinner} />
                    {uploadStep ? `Uploading photo ${uploadStep.done + 1} of ${uploadStep.total}...` : 'Creating...'}
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
