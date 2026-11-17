import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert, TextInput, RefreshControl,
} from 'react-native';
import {
  ChevronLeft, Heart, Share as ShareIcon, Check, CheckCircle,
  Package, RefreshCw, Banknote, ShoppingBag, Zap,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, elevation } from '../theme';
import { FadeInUp } from '../components/AnimatedUI';
import { addToLocalCart, type LocalCartItem } from '../services/localCart';
import {
  getProductBySlug, getProducts, formatPaise, getTotalStock, addToCart, isLoggedIn,
  type Product, type ProductVariant,
} from '../services/api';

const { width } = Dimensions.get('window');

interface Props {
  route: { params: { slug: string } };
  navigation: any;
}

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinChecked, setPinChecked] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  useEffect(() => { loadProduct(); }, [slug]);

  const loadProduct = async () => {
    try {
      setError('');
      const data = await getProductBySlug(slug);
      setProduct(data);
      if (data.variants.length > 0) setSelectedVariant(data.variants[0]);
      try {
        const related = await getProducts({ limit: '6' });
        setRelatedProducts((related.items || []).filter((p: any) => p.slug !== slug).slice(0, 6));
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (error || !product) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.ghostLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stock = selectedVariant?.available ?? 0;
  const discount = selectedVariant?.compareAtPaise && selectedVariant.compareAtPaise > selectedVariant.pricePaise
    ? Math.round((1 - selectedVariant.pricePaise / selectedVariant.compareAtPaise) * 100)
    : null;

  const handleAddToCart = async () => {
    if (!selectedVariant || !product) return;
    setAddingToCart(true);
    try {
      if (isLoggedIn()) {
        await addToCart(selectedVariant.id, 1);
      } else {
        // Guest: add to local cart
        await addToLocalCart({
          variantId: selectedVariant.id,
          quantity: 1,
          productTitle: product.title,
          productSlug: product.slug,
          variantName: selectedVariant.name,
          color: selectedVariant.color,
          sku: selectedVariant.sku,
          pricePaise: selectedVariant.pricePaise,
          compareAtPaise: selectedVariant.compareAtPaise,
          available: selectedVariant.available,
        });
      }
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await loadProduct();
            setRefreshing(false);
          }} tintColor={colors.primary} />
        }
      >
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={20} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => setWishlisted(!wishlisted)}>
              <Heart
                size={20}
                color={wishlisted ? colors.primary : colors.textPrimary}
                fill={wishlisted ? colors.primary : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn}>
              <ShareIcon size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <View style={styles.heroImage}>
            <View style={styles.heroPlaceholder} />
            {/* GI Badge */}
            <View style={styles.giBadge}>
              <View style={styles.giDot} />
              <Text style={styles.giText}>GI CERTIFIED LOOM</Text>
            </View>
          </View>
          {/* Dot Pagination */}
          <View style={styles.dotRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Title & Price */}
        <FadeInUp delay={100} duration={500}>
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clusterLabel}>
                {(product.origin || 'HANDCRAFT').toUpperCase()}
              </Text>
              <Text style={styles.productTitle}>{product.title}</Text>
            </View>
            {stock > 0 && stock <= 3 && (
              <View style={styles.scarcityBadge}>
                <Zap size={12} color={colors.error} strokeWidth={2} />
                <Text style={styles.scarcityText}>Only {stock} left</Text>
              </View>
            )}
          </View>

          {/* Price */}
          {selectedVariant && (
            <View style={styles.priceRow}>
              <Text style={styles.mainPrice}>{formatPaise(selectedVariant.pricePaise)}</Text>
              {selectedVariant.compareAtPaise && selectedVariant.compareAtPaise > selectedVariant.pricePaise && (
                <Text style={styles.comparePrice}>{formatPaise(selectedVariant.compareAtPaise)}</Text>
              )}
              {discount && (
                <View style={styles.discountPill}>
                  <Text style={styles.discountText}>{discount}% off</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.taxNote}>Inclusive of all taxes and handloom cess</Text>
        </View>
        </FadeInUp>

        <View style={styles.divider} />

        {/* Colour Variant Swatches */}
        {product.variants.length > 1 && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Colour</Text>
                <Text style={styles.sectionMeta}>
                  {selectedVariant?.color || selectedVariant?.name || 'Default'} (Selected)
                </Text>
              </View>
              <View style={styles.swatchRow}>
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.swatch, isSelected && styles.swatchActive]}
                      onPress={() => setSelectedVariant(v)}
                    >
                      <View style={[styles.swatchInner, { backgroundColor: getColorHex(v.color || '') }]} />
                      {isSelected && (
                        <View style={styles.swatchCheck}>
                          <Check size={12} color={colors.white} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Check Delivery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check delivery</Text>
          <View style={styles.pinRow}>
            <TextInput
              style={styles.pinInput}
              value={pinCode}
              onChangeText={(t) => { setPinCode(t.replace(/[^0-9]/g, '')); setPinChecked(false); }}
              placeholder="Enter PIN code"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.pinCheckBtn, pinCode.length < 6 && { opacity: 0.4 }]}
              onPress={() => pinCode.length === 6 && setPinChecked(true)}
              disabled={pinCode.length < 6}
            >
              <Text style={styles.pinCheckText}>Check</Text>
            </TouchableOpacity>
          </View>
          {pinChecked && (
            <View style={styles.pinResults}>
              <View style={styles.pinResultRow}>
                <CheckCircle size={16} color="#3D8B63" strokeWidth={2} />
                <Text style={styles.pinResultText}>Delivery in 5–7 days</Text>
              </View>
              <View style={styles.pinResultRow}>
                <CheckCircle size={16} color="#3D8B63" strokeWidth={2} />
                <Text style={styles.pinResultText}>Cash on delivery available</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Details Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsTable}>
            {product.fabric && <DetailRow label="Fabric" value={product.fabric} even={false} />}
            {product.weaveMethod && <DetailRow label="Weave" value={product.weaveMethod} even={true} />}
            {product.origin && <DetailRow label="Origin" value={product.origin} even={false} />}
            {product.length && <DetailRow label="Length" value={product.length} even={true} />}
            {product.blousePiece && <DetailRow label="Blouse Piece" value={product.blousePiece} even={false} />}
            {product.careInstructions && <DetailRow label="Wash Care" value={product.careInstructions} even={true} />}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Delivery & Returns */}
        <View style={styles.section}>
          <View style={styles.deliveryItems}>
            <DeliveryItem icon={<Package size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="5–7 business days" sub="Hand-packed securely in reusable muslin" />
            <DeliveryItem icon={<RefreshCw size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="7-day hassle-free returns" sub="No questions asked pick-up" />
            <DeliveryItem icon={<Banknote size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="Cash on delivery" sub="Inspect before payment" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>You may also like</Text>
              <Text style={styles.relatedMeta}>RELATED WEAVES</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
              {relatedProducts.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.relatedCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.push('ProductDetail', { slug: p.slug })}
                >
                  <View style={styles.relatedImage} />
                  <View style={styles.relatedMeta2}>
                    <Text style={styles.relatedOrigin}>
                      {(p.origin || 'Odisha').split(',')[0].toUpperCase()}
                    </Text>
                    <Text style={styles.relatedName} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.relatedPrice}>{formatPaise(p.startingPricePaise ?? 0)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyPriceCol}>
          <Text style={styles.stickyPriceLabel}>PRICE</Text>
          <Text style={styles.stickyPrice}>
            {selectedVariant ? formatPaise(selectedVariant.pricePaise) : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            addedToCart && styles.addToCartSuccess,
            (stock <= 0 || addingToCart) && !addedToCart && styles.addToCartDisabled,
          ]}
          disabled={stock <= 0 || addingToCart}
          activeOpacity={0.85}
          onPress={handleAddToCart}
        >
          <ShoppingBag size={18} color={colors.white} strokeWidth={2} />
          <Text style={styles.addToCartText}>
            {addedToCart ? 'Added to Bag ✓' : addingToCart ? 'Adding...' : stock > 0 ? 'Add to Bag' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailRow({ label, value, even }: { label: string; value: string; even: boolean }) {
  return (
    <View style={[styles.detailRow, even && styles.detailRowEven]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DeliveryItem({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <View style={styles.deliveryItem}>
      <View style={styles.deliveryIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.deliveryTitle}>{title}</Text>
        <Text style={styles.deliverySub}>{sub}</Text>
      </View>
    </View>
  );
}

function getColorHex(colorName: string): string {
  const map: Record<string, string> = {
    red: '#C0392B', blue: '#2E86C1', green: '#27AE60', black: '#1A1A1A',
    white: '#F5F5F5', maroon: '#6E2334', gold: '#B5956B', yellow: '#F1C40F',
    pink: '#E91E63', orange: '#E67E22', purple: '#8E44AD',
    'deep maroon': '#6E2334', 'peacock blue': '#1B4965', 'forest green': '#283618',
  };
  return map[colorName.toLowerCase()] || '#CCCCCC';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: {},
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.error, marginBottom: 12 },
  ghostLink: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },

  // Top Bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.margin, paddingTop: 48, paddingBottom: spacing.sm,
  },
  topBarRight: { flexDirection: 'row', gap: 8 },
  circleBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F4F4F1', justifyContent: 'center', alignItems: 'center',
  },

  // Hero
  heroWrap: { paddingHorizontal: spacing.margin, paddingBottom: spacing.sm },
  heroImage: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: borderRadius.md,
    overflow: 'hidden', backgroundColor: '#E0DDD8', position: 'relative',
  },
  heroPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#D5CFC9' },
  giBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(249,249,246,0.9)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  giDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3D8B63' },
  giText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textPrimary, letterSpacing: 1 },

  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E3E0' },
  dotActive: { backgroundColor: colors.primary, transform: [{ scale: 1.25 }] },

  // Info
  infoSection: { paddingHorizontal: spacing.margin, paddingTop: spacing.sm, paddingBottom: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  clusterLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent,
    letterSpacing: 2, marginBottom: 4,
  },
  productTitle: {
    fontFamily: 'NotoSerif-Regular', fontSize: 20, lineHeight: 26,
    color: colors.textPrimary,
  },
  scarcityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFDAD6', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full, flexShrink: 0,
  },
  scarcityText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.error },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  mainPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.textPrimary, letterSpacing: -0.4 },
  comparePrice: {
    fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: '#FFDAAB', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  discountText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#795E38' },
  taxNote: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 6 },

  // Shared
  divider: { height: 1, backgroundColor: '#E2E3E0' },
  section: { paddingHorizontal: spacing.margin, paddingVertical: spacing.md },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionMeta: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary },

  // Swatches
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatch: {
    width: 36, height: 36, borderRadius: 18, padding: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  swatchActive: { backgroundColor: colors.primary },
  swatchInner: { width: '100%', height: '100%', borderRadius: 16 },
  swatchCheck: {
    position: 'absolute', justifyContent: 'center', alignItems: 'center',
  },

  // PIN
  pinRow: { flexDirection: 'row', gap: 8 },
  pinInput: {
    flex: 1, height: 48, paddingHorizontal: 14,
    borderRadius: 8, backgroundColor: colors.surface,
    fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  pinCheckBtn: {
    height: 48, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    borderRadius: 8, backgroundColor: '#E8E8E5',
  },
  pinCheckText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary },
  pinResults: {
    marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#F4F4F1', gap: 6,
  },
  pinResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinResultText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#3D8B63' },

  // Details Table
  detailsTable: {
    borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  detailRowEven: { backgroundColor: 'rgba(244,244,241,0.5)' },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  detailValue: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textPrimary },

  // Delivery
  deliveryItems: { gap: 12 },
  deliveryItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center',
  },
  deliveryTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary },
  deliverySub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },

  // Related
  relatedSection: { paddingVertical: spacing.md },
  relatedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.margin, marginBottom: 12,
  },
  relatedTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 17, color: colors.textPrimary },
  relatedMeta: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },
  relatedScroll: { paddingHorizontal: spacing.margin, gap: 12 },
  relatedCard: {
    width: 160, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  relatedImage: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#E0DDD8' },
  relatedMeta2: { padding: 10 },
  relatedOrigin: {
    fontFamily: 'DMSans-SemiBold', fontSize: 10, color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  relatedName: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  relatedPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.accent, marginTop: 4, letterSpacing: -0.3 },

  // Sticky Bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.margin, paddingVertical: 12, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 5,
  },
  stickyPriceCol: { paddingRight: 8 },
  stickyPriceLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 10, color: colors.textTertiary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  stickyPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.textPrimary, letterSpacing: -0.4 },
  addToCartBtn: {
    flex: 1, height: 48, borderRadius: 6,
    backgroundColor: '#6E2334', flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  addToCartSuccess: { backgroundColor: '#3D8B63' },
  addToCartDisabled: { opacity: 0.4 },
  addToCartText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
});
