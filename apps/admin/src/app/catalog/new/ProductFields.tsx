'use client';

// The two field sections the Create and the Edit product pages share: the basic information and the
// fabric details. The page owns the values; these only show them and report each change.
import type { ReactNode } from 'react';
import styles from './new.module.css';

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductFields {
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  publishStatus: ProductStatus;
  fabric: string;
  weaveMethod: string;
  origin: string;
  careInstructions: string;
  blousePiece: string;
  length: string;
  width: string;
  weight: string;
  occasion: string; // comma separated
  tags: string; // comma separated
}

export const emptyProductFields = (): ProductFields => ({
  title: '', shortDescription: '', description: '', categoryId: '', publishStatus: 'draft',
  fabric: '', weaveMethod: '', origin: '', careInstructions: '', blousePiece: '', length: '', width: '', weight: '',
  occasion: '', tags: '',
});

/** "Festive, Wedding" -> ['Festive', 'Wedding'] */
export const splitList = (text: string): string[] => text.split(',').map((s) => s.trim()).filter(Boolean);

interface SectionProps {
  values: ProductFields;
  onChange: (name: keyof ProductFields, value: string) => void;
  active: boolean;
  onActivate: () => void;
  /** shows a tick instead of the section number */
  complete: boolean;
}

export function BasicInfoSection({
  values, onChange, active, onActivate, complete, categories, allowArchived,
}: SectionProps & { categories: { id: string; name: string }[]; allowArchived?: boolean }): ReactNode {
  return (
          <section
            className={`${styles.section} ${active ? styles.sectionActive : ''}`}
            onClick={onActivate}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {complete ? (
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
                  value={values.title}
                  onChange={(e) => onChange('title', e.target.value)}
                  placeholder="e.g. Sambalpuri Ikat Silk Saree – Maroon & Gold"
                  required
                  className={styles.inputLg}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Short Description</label>
                <input
                  value={values.shortDescription}
                  onChange={(e) => onChange('shortDescription', e.target.value)}
                  placeholder="One-liner for product cards (max 500 chars)"
                  maxLength={500}
                />
                <span className={styles.charCount}>{values.shortDescription.length}/500</span>
              </div>
              <div className={styles.formGroup}>
                <label>Full Description</label>
                <textarea
                  value={values.description}
                  onChange={(e) => onChange('description', e.target.value)}
                  placeholder="Detailed product description — fabric story, craftsmanship, styling tips..."
                  rows={5}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Category <span className={styles.required}>*</span></label>
                  <select value={values.categoryId} onChange={(e) => onChange('categoryId', e.target.value)} required>
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
                      className={`${styles.toggleBtn} ${values.publishStatus === 'draft' ? styles.toggleActive : ''}`}
                      onClick={() => onChange('publishStatus', 'draft')}
                    >
                      <span className={styles.toggleDot} style={{ background: '#F59E0B' }} />
                      Draft
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${values.publishStatus === 'published' ? styles.toggleActive : ''}`}
                      onClick={() => onChange('publishStatus', 'published')}
                    >
                      <span className={styles.toggleDot} style={{ background: '#10B981' }} />
                      Published
                    </button>
                    {allowArchived && (
                      <button
                        type="button"
                        className={`${styles.toggleBtn} ${values.publishStatus === 'archived' ? styles.toggleActive : ''}`}
                        onClick={() => onChange('publishStatus', 'archived')}
                      >
                        <span className={styles.toggleDot} style={{ background: '#94A3B8' }} />
                        Archived
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
  );
}

export function FabricSection({ values, onChange, active, onActivate, complete }: SectionProps): ReactNode {
  const occasionTags = splitList(values.occasion);
  const tagsList = splitList(values.tags);
  return (
          <section
            className={`${styles.section} ${active ? styles.sectionActive : ''}`}
            onClick={onActivate}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>
                {complete ? (
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
                  <input value={values.fabric} onChange={(e) => onChange('fabric', e.target.value)} placeholder="Pure Silk" />
                </div>
                <div className={styles.formGroup}>
                  <label>Weave Method</label>
                  <input value={values.weaveMethod} onChange={(e) => onChange('weaveMethod', e.target.value)} placeholder="Handloom Ikat" />
                </div>
                <div className={styles.formGroup}>
                  <label>Origin</label>
                  <input value={values.origin} onChange={(e) => onChange('origin', e.target.value)} placeholder="Sonepur, Odisha" />
                </div>
              </div>
              <div className={styles.formGrid3}>
                <div className={styles.formGroup}>
                  <label>Length</label>
                  <input value={values.length} onChange={(e) => onChange('length', e.target.value)} placeholder="5.5 meters" />
                </div>
                <div className={styles.formGroup}>
                  <label>Width</label>
                  <input value={values.width} onChange={(e) => onChange('width', e.target.value)} placeholder="46 inches" />
                </div>
                <div className={styles.formGroup}>
                  <label>Weight</label>
                  <input value={values.weight} onChange={(e) => onChange('weight', e.target.value)} placeholder="450 grams" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Blouse Piece</label>
                  <input value={values.blousePiece} onChange={(e) => onChange('blousePiece', e.target.value)} placeholder="Included – 0.8m unstitched" />
                </div>
                <div className={styles.formGroup}>
                  <label>Care Instructions</label>
                  <input value={values.careInstructions} onChange={(e) => onChange('careInstructions', e.target.value)} placeholder="Dry clean only" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Occasion</label>
                  <input value={values.occasion} onChange={(e) => onChange('occasion', e.target.value)} placeholder="Festive, Wedding, Party" />
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
                  <input value={values.tags} onChange={(e) => onChange('tags', e.target.value)} placeholder="silk, ikat, bapta" />
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
  );
}
