'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import StockAdjustModal, { type StockTarget } from '../../../components/StockAdjustModal';
import PhotoManager from '../../../components/PhotoManager';
import { api, type AdminProductDetail, messageOf } from '../../../services/api';
import { BasicInfoSection, FabricSection, splitList, type ProductFields } from '../new/ProductFields';
import styles from '../new/new.module.css';
import edit from './edit.module.css';

// ── what the form holds, and how it maps to and from the API ──

interface VariantEdit {
  name: string;
  color: string;
  price: string; // rupees
  compare: string; // rupees, empty = none
  active: boolean;
}
interface NewVariant {
  key: number;
  sku: string;
  name: string;
  color: string;
  price: string;
  compare: string;
  stock: string;
}

const rupees = (paise: number | null) => (paise == null ? '' : String(paise / 100));
const toPaise = (rupeesText: string) => Math.round(parseFloat(rupeesText) * 100);
const money = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });

function fieldsOf(p: AdminProductDetail): ProductFields {
  return {
    title: p.title, shortDescription: p.shortDescription ?? '', description: p.description ?? '',
    categoryId: p.categoryId, publishStatus: p.publishStatus,
    fabric: p.fabric ?? '', weaveMethod: p.weaveMethod ?? '', origin: p.origin ?? '',
    careInstructions: p.careInstructions ?? '', blousePiece: p.blousePiece ?? '',
    length: p.length ?? '', width: p.width ?? '', weight: p.weight ?? '',
    occasion: p.occasion.join(', '), tags: p.tags.join(', '),
  };
}
function editsOf(p: AdminProductDetail): Record<string, VariantEdit> {
  return Object.fromEntries(p.variants.map((v) => [v.id, {
    name: v.name ?? '', color: v.color ?? '', price: rupees(v.pricePaise), compare: rupees(v.compareAtPaise), active: v.active,
  }]));
}

const TEXT_FIELDS = ['title', 'shortDescription', 'description', 'categoryId', 'publishStatus', 'fabric', 'weaveMethod', 'origin',
  'careInstructions', 'blousePiece', 'length', 'width', 'weight'] as const;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading');
  const [fields, setFields] = useState<ProductFields | null>(null);
  const [edits, setEdits] = useState<Record<string, VariantEdit>>({});
  const [added, setAdded] = useState<NewVariant[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [adjusting, setAdjusting] = useState<StockTarget | null>(null);
  const [justCreated, setJustCreated] = useState(false); // arrived from "Create product": photos are the next step
  const [photosFailed, setPhotosFailed] = useState(0); // photos chosen on the Create page that could not be uploaded

  // Read the product (again), and put the form back in line with what is saved
  const load = useCallback(async () => {
    try {
      const p = await api.getProduct(id);
      setProduct(p);
      setFields(fieldsOf(p));
      setEdits(editsOf(p));
      setAdded([]);
      setState('ready');
    } catch (err) {
      setState(/not found/i.test(messageOf(err, '')) ? 'missing' : 'failed');
      setError(messageOf(err, ''));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);

  // Coming here straight after creating a product: say so and bring the Photos section into view
  useEffect(() => {
    if (state !== 'ready' || justCreated || new URLSearchParams(window.location.search).get('created') !== '1') return;
    setJustCreated(true);
    setPhotosFailed(Number(new URLSearchParams(window.location.search).get('photosFailed')) || 0);
    setActiveSection(3);
    document.getElementById('photos')?.scrollIntoView({ block: 'start' });
  }, [state, justCreated]);

  const setField = (name: keyof ProductFields, value: string) => {
    setFields((f) => (f ? { ...f, [name]: value } : f));
    setSaved(false);
  };
  const setEdit = (variantId: string, patch: Partial<VariantEdit>) => {
    setEdits((e) => ({ ...e, [variantId]: { ...e[variantId], ...patch } }));
    setSaved(false);
  };
  const setNew = (key: number, patch: Partial<NewVariant>) => {
    setAdded((list) => list.map((v) => (v.key === key ? { ...v, ...patch } : v)));
    setSaved(false);
  };

  // ── what changed since the last save ──
  const changes = useMemo(() => {
    if (!product || !fields) return { productBody: {} as Record<string, unknown>, variantBodies: [] as { id: string; body: Record<string, unknown> }[] };
    const original = fieldsOf(product);
    const productBody: Record<string, unknown> = {};
    for (const k of TEXT_FIELDS) {
      const now = k === 'title' ? fields[k].trim() : fields[k];
      if (now !== original[k]) productBody[k] = now;
    }
    if (JSON.stringify(splitList(fields.occasion)) !== JSON.stringify(product.occasion)) productBody.occasion = splitList(fields.occasion);
    if (JSON.stringify(splitList(fields.tags)) !== JSON.stringify(product.tags)) productBody.tags = splitList(fields.tags);

    const variantBodies: { id: string; body: Record<string, unknown> }[] = [];
    for (const v of product.variants) {
      const e = edits[v.id];
      if (!e) continue;
      const body: Record<string, unknown> = {};
      if (e.name !== (v.name ?? '')) body.name = e.name;
      if (e.color !== (v.color ?? '')) body.color = e.color;
      if (e.price.trim() !== '' && toPaise(e.price) !== v.pricePaise) body.pricePaise = toPaise(e.price);
      const compareNow = e.compare.trim() === '' ? null : toPaise(e.compare);
      if (compareNow !== v.compareAtPaise) body.compareAtPaise = compareNow;
      if (e.active !== v.active) body.active = e.active;
      if (Object.keys(body).length) variantBodies.push({ id: v.id, body });
    }
    return { productBody, variantBodies };
  }, [product, fields, edits]);

  // ── what still needs fixing before it can be saved ──
  const problems: string[] = [];
  if (product && fields) {
    if (fields.title.trim().length < 2) problems.push('a title');
    if (!fields.categoryId) problems.push('a category');
    for (const v of product.variants) {
      const e = edits[v.id];
      if (!e) continue;
      const price = parseFloat(e.price);
      if (!(price > 0)) problems.push(`a price for ${v.sku}`);
      else if (e.compare.trim() !== '' && !(parseFloat(e.compare) > price)) problems.push(`a compare price above the price for ${v.sku}`);
    }
    for (const n of added) {
      const price = parseFloat(n.price);
      if (!n.sku.trim()) problems.push('a SKU for the new colour');
      if (!(price > 0)) problems.push(`a price for the new colour ${n.sku || ''}`.trim());
      else if (n.compare.trim() !== '' && !(parseFloat(n.compare) > price)) problems.push('a compare price above the price for the new colour');
      if (n.stock.trim() === '' || !(parseInt(n.stock, 10) >= 0)) problems.push(`the starting stock for the new colour ${n.sku || ''}`.trim());
    }
  }
  const dirty = Object.keys(changes.productBody).length > 0 || changes.variantBodies.length > 0 || added.length > 0;
  const canSave = dirty && problems.length === 0 && !saving;

  // warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || !product) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      if (Object.keys(changes.productBody).length) await api.updateProduct(product.id, changes.productBody);
      for (const v of changes.variantBodies) await api.updateVariant(product.id, v.id, v.body);
      for (const n of added) {
        await api.addVariant(product.id, {
          sku: n.sku.trim(),
          ...(n.name.trim() ? { name: n.name.trim() } : {}),
          ...(n.color.trim() ? { color: n.color.trim() } : {}),
          pricePaise: toPaise(n.price),
          ...(n.compare.trim() ? { compareAtPaise: toPaise(n.compare) } : {}),
          initialStock: parseInt(n.stock, 10),
        });
      }
      await load();
      setSaved(true);
    } catch (err) {
      setError(messageOf(err, 'Could not save the changes. Please try again.'));
      await load().catch(() => {}); // some of the changes may have been saved: show what is now stored
      setSaved(false);
    }
    setSaving(false);
  };

  const backButton = (
    <button className={styles.backBtn} onClick={() => router.push('/catalog')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to Catalog
    </button>
  );

  if (state !== 'ready' || !product || !fields) {
    return (
      <AdminLayout title="Edit Product" actions={backButton}>
        <div className={edit.notice}>
          {state === 'loading' && 'Loading product...'}
          {state === 'missing' && 'This product was not found.'}
          {state === 'failed' && `Could not load this product. ${error}`}
        </div>
      </AdminLayout>
    );
  }

  const activeCount = product.variants.filter((v) => v.active).length;
  const totalAvailable = product.variants.reduce((sum, v) => sum + (v.inventory ? v.inventory.onHand - v.inventory.reserved - v.inventory.unavailable : 0), 0);
  const fabricFilled = [fields.fabric, fields.weaveMethod, fields.origin].filter(Boolean).length;

  return (
    <AdminLayout title="Edit Product" subtitle={product.slug} actions={backButton}>
      <form className={styles.pageLayout} onSubmit={save}>
        <div className={styles.formColumn}>
          <BasicInfoSection
            values={fields} onChange={setField} categories={categories} allowArchived
            active={activeSection === 0} onActivate={() => setActiveSection(0)} complete={!!fields.title && !!fields.categoryId}
          />
          <FabricSection
            values={fields} onChange={setField}
            active={activeSection === 1} onActivate={() => setActiveSection(1)} complete={fabricFilled >= 2}
          />

          {/* Colours and prices */}
          <section
            className={`${styles.section} ${activeSection === 2 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(2)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>3</div>
              <div>
                <h3 className={styles.sectionTitle}>Colours, prices &amp; stock</h3>
                <p className={styles.sectionDesc}>Change a price or name, hide a colour from the shop, or add a new colour. The SKU cannot be changed.</p>
              </div>
              <button type="button" className={styles.addVariantBtn} onClick={() => setAdded((l) => [...l, { key: Date.now(), sku: '', name: '', color: '', price: '', compare: '', stock: '' }])}>
                + Add colour
              </button>
            </div>
            <div className={styles.sectionBody}>
              {product.variants.map((v, idx) => {
                const e = edits[v.id];
                if (!e) return null;
                const inv = v.inventory;
                const available = inv ? inv.onHand - inv.reserved - inv.unavailable : 0;
                return (
                  <div key={v.id} className={styles.variantCard} data-testid="variant-card">
                    <div className={styles.variantTop}>
                      <div className={styles.variantBadge}>
                        {e.color && <span className={styles.colorDot} style={{ background: e.color.toLowerCase() }} />}
                        Colour {idx + 1}
                        {!e.active && <span className={edit.hiddenTag}>Hidden from shop</span>}
                      </div>
                      <label className={edit.showRow}>
                        <input type="checkbox" checked={e.active} onChange={(ev) => setEdit(v.id, { active: ev.target.checked })} />
                        Show in shop
                      </label>
                    </div>
                    <div className={styles.variantGrid}>
                      <div className={styles.formGroup}>
                        <label>SKU</label>
                        <div className={edit.skuFixed}>{v.sku}</div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Variant Name</label>
                        <input value={e.name} onChange={(ev) => setEdit(v.id, { name: ev.target.value })} maxLength={100} placeholder="Maroon with Gold Border" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Color</label>
                        <input value={e.color} onChange={(ev) => setEdit(v.id, { color: ev.target.value })} maxLength={50} placeholder="Maroon" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Price (₹) <span className={styles.required}>*</span></label>
                        <div className={styles.inputWithPrefix}>
                          <span className={styles.inputPrefix}>₹</span>
                          <input type="number" step="0.01" min="0.01" value={e.price} onChange={(ev) => setEdit(v.id, { price: ev.target.value })} aria-label={`Price for ${v.sku}`} />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Compare Price (₹)</label>
                        <div className={styles.inputWithPrefix}>
                          <span className={styles.inputPrefix}>₹</span>
                          <input type="number" step="0.01" min="0.01" value={e.compare} onChange={(ev) => setEdit(v.id, { compare: ev.target.value })} placeholder="none" aria-label={`Compare price for ${v.sku}`} />
                        </div>
                      </div>
                      <div className={edit.stockLine}>
                        <span>On hand <strong>{inv?.onHand ?? 0}</strong></span>
                        <span>Reserved <strong>{inv?.reserved ?? 0}</strong></span>
                        <span>Available <strong>{available}</strong></span>
                        <button
                          type="button"
                          className={edit.adjustBtn}
                          onClick={() => setAdjusting({
                            variantId: v.id, productTitle: product.title, sku: v.sku, label: v.color || v.name || 'Default',
                            onHand: inv?.onHand ?? 0, reserved: inv?.reserved ?? 0, unavailable: inv?.unavailable ?? 0,
                          })}
                        >
                          Adjust stock
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {added.map((n, i) => (
                <div key={n.key} className={styles.variantCard} data-testid="new-variant-card">
                  <div className={styles.variantTop}>
                    <div className={styles.variantBadge}>New colour {i + 1}</div>
                    <button type="button" className={styles.removeBtn} onClick={() => setAdded((l) => l.filter((x) => x.key !== n.key))}>Remove</button>
                  </div>
                  <div className={styles.variantGrid}>
                    <div className={styles.formGroup}>
                      <label>SKU <span className={styles.required}>*</span></label>
                      <input className={styles.inputMono} value={n.sku} onChange={(ev) => setNew(n.key, { sku: ev.target.value })} maxLength={50} placeholder="JUH-IKT-MRN-002" aria-label="New colour SKU" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Variant Name</label>
                      <input value={n.name} onChange={(ev) => setNew(n.key, { name: ev.target.value })} maxLength={100} />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Color</label>
                      <input value={n.color} onChange={(ev) => setNew(n.key, { color: ev.target.value })} maxLength={50} aria-label="New colour name" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Price (₹) <span className={styles.required}>*</span></label>
                      <div className={styles.inputWithPrefix}>
                        <span className={styles.inputPrefix}>₹</span>
                        <input type="number" step="0.01" min="0.01" value={n.price} onChange={(ev) => setNew(n.key, { price: ev.target.value })} aria-label="New colour price" />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Compare Price (₹)</label>
                      <div className={styles.inputWithPrefix}>
                        <span className={styles.inputPrefix}>₹</span>
                        <input type="number" step="0.01" min="0.01" value={n.compare} onChange={(ev) => setNew(n.key, { compare: ev.target.value })} />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Starting stock <span className={styles.required}>*</span></label>
                      <input type="number" min="0" value={n.stock} onChange={(ev) => setNew(n.key, { stock: ev.target.value })} aria-label="New colour starting stock" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Photos: saved the moment they are added, so they live outside the form's Save button */}
          <section
            id="photos"
            className={`${styles.section} ${activeSection === 3 ? styles.sectionActive : ''}`}
            onClick={() => setActiveSection(3)}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>4</div>
              <div>
                <h3 className={styles.sectionTitle}>Photos</h3>
                <p className={styles.sectionDesc}>The first photo is the cover on the shop, in the app and in lists. Photos are saved as soon as you add them.</p>
              </div>
            </div>
            <div className={styles.sectionBody}>
              {justCreated && photosFailed > 0 && (
                <div className={edit.savedCard} role="status">✓ Product created, but {photosFailed === 1 ? '1 photo' : `${photosFailed} photos`} could not be uploaded (too small, too large or not a picture). Add {photosFailed === 1 ? 'it' : 'them'} again here.</div>
              )}
              {justCreated && photosFailed === 0 && (product.media ?? []).length > 0 && (
                <div className={edit.savedCard} role="status">✓ Product created with {(product.media ?? []).length === 1 ? '1 photo' : `${(product.media ?? []).length} photos`}. You can add more or change the order here.</div>
              )}
              {justCreated && photosFailed === 0 && (product.media ?? []).length === 0 && (
                <div className={edit.savedCard} role="status">✓ Product created. Add its photos here; it shows a grey box in the shop until you do.</div>
              )}
              <PhotoManager
                productId={product.id}
                photos={product.media ?? []}
                colours={product.variants.map((v) => ({ id: v.id, label: v.color || v.name || v.sku }))}
                onChange={(media) => setProduct((current) => (current ? { ...current, media } : current))}
              />
            </div>
          </section>

          {saved && <div className={edit.savedCard} role="status">✓ Changes saved</div>}
          {error && <div className={styles.errorCard} role="alert">{error}</div>}
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.statusCard}>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Status</span>
              <span className={fields.publishStatus === 'published' ? styles.statusPublished : styles.statusDraft}>
                {fields.publishStatus === 'published' ? 'Published' : fields.publishStatus === 'archived' ? 'Archived' : 'Draft'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Colours shown</span>
              <span className={styles.statusValue}>{activeCount} of {product.variants.length}</span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusLabel}>Available</span>
              <span className={styles.statusValue}>{totalAvailable}</span>
            </div>
            <div className={styles.statusDivider} />
            <div className={styles.statusLabel}>Shop address</div>
            <div className={edit.skuFixed}>/shop/{product.slug}</div>
            <p className={edit.hint}>
              {product.publishStatus === 'draft'
                ? 'While this is a draft, the address follows the title. Once published it stays the same, so shared links keep working.'
                : 'The address stays the same when the title changes, so shared links keep working.'}
            </p>
          </div>
          <div className={styles.statusCard}>
            <div className={styles.statusLabel}>Prices</div>
            {product.variants.map((v) => (
              <div key={v.id} className={styles.statusRow}>
                <span className={styles.statusLabel}>{v.color || v.name || v.sku}</span>
                <span className={styles.statusValue}>{money(v.pricePaise)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.bottomBarInner}>
            <button type="button" className={styles.cancelBtn} onClick={() => router.push('/catalog')}>
              {dirty ? 'Discard & go back' : 'Back'}
            </button>
            <div className={styles.bottomRight}>
              {dirty && problems.length > 0 && (
                <span className={edit.problemList}>Still needed: {problems.join(', ')}.</span>
              )}
              <button type="submit" className={styles.publishBtn} disabled={!canSave}>
                {saving ? <><span className={styles.btnSpinner} /> Saving...</> : dirty ? 'Save changes' : 'No changes'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {adjusting && <StockAdjustModal target={adjusting} onClose={() => setAdjusting(null)} onSaved={load} />}
    </AdminLayout>
  );
}
