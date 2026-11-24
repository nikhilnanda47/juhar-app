import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, TextInput, RefreshControl,
  Animated as RNAnimated, Platform,
} from 'react-native';
import {
  ChevronLeft, Heart, Share as ShareIcon, Check, CheckCircle,
  Package, RefreshCw, Banknote, ShoppingBag, Zap,
} from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius, elevation } from '../theme';
import { FadeInUp } from '../components/AnimatedUI';
import { addToLocalCart, type LocalCartItem } from '../services/localCart';
import {
  getProductBySlug, getProducts, formatPaise, getTotalStock, addToCart, isLoggedIn,
  type Product, type ProductVariant,
} from '../services/api';
import { useWishlist } from '../contexts/WishlistContext';
import { showAlert } from '../utils/showAlert';

const { width } = Dimensions.get('window');

interface Props {
  route: { params: { slug: string } };
  navigation: any;
}

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [product, setProduct] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [pinCode, setPinCode] = useState('');
  const [pinChecked, setPinChecked] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const toastAnim = useRef(new RNAnimated.Value(0)).current;

  const showToast = () => {
    setToastVisible(true);
    RNAnimated.sequence([
      RNAnimated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
      RNAnimated.delay(2200),
      RNAnimated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => setToastVisible(false));
  };

  useEffect(() => { loadProduct(); }, [slug]);

  useFocusEffect(
    useCallback(() => {
      setAddedToCart(false);
    }, [])
  );

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
      showToast();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to add to cart');
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
            <TouchableOpacity style={styles.circleBtn} onPress={() => selectedVariant && toggleWishlist(selectedVariant.id)}>
              <Heart
                size={20}
                color={selectedVariant && isWishlisted(selectedVariant.id) ? colors.primary : colors.textPrimary}
                fill={selectedVariant && isWishlisted(selectedVariant.id) ? colors.primary : 'none'}
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
            <View style={styles.giBadge}>
              <View style={styles.giDot} />
              <Text style={styles.giText}>GI CERTIFIED LOOM</Text>
            </View>
          </View>
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
                <CheckCircle size={16} color={colors.success} strokeWidth={2} />
                <Text style={styles.pinResultText}>Delivery in 5-7 days</Text>
              </View>
              <View style={styles.pinResultRow}>
                <CheckCircle size={16} color={colors.success} strokeWidth={2} />
                <Text style={styles.pinResultText}>Cash on delivery available</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Details Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Fabric" value={product.fabric} even={false} colors={colors} />
          <DetailRow label="Weave" value={product.weaveMethod} even={true} colors={colors} />
          <DetailRow label="Origin" value={product.origin} even={false} colors={colors} />
          <DetailRow label="Length" value={product.length} even={true} colors={colors} />
          <DetailRow label="Blouse Piece" value={product.blousePiece} even={false} colors={colors} />
          <DetailRow label="Wash Care" value={product.careInstructions} even={true} colors={colors} />
        </View>

        <View style={styles.divider} />

        {/* Delivery & Returns */}
        <View style={styles.section}>
          <View style={styles.deliveryItems}>
            <DeliveryItem icon={<Package size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="5-7 business days" sub="Hand-packed securely in reusable muslin" colors={colors} />
            <DeliveryItem icon={<RefreshCw size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="7-day hassle-free returns" sub="No questions asked pick-up" colors={colors} />
            <DeliveryItem icon={<Banknote size={18} color={colors.textPrimary} strokeWidth={1.5} />} title="Cash on delivery" sub="Inspect before payment" colors={colors} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>You may also like</Text>
              <Text style={styles.relatedMetaLabel}>RELATED WEAVES</Text>
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

      {/* Toast notification */}
      {toastVisible && (
        <RNAnimated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Check size={16} color="#fff" strokeWidth={2.5} />
          <Text style={styles.toastText}>Added to bag!</Text>
        </RNAnimated.View>
      )}

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
          onPress={addedToCart ? () => navigation.navigate('Cart') : handleAddToCart}
        >
          <ShoppingBag size={18} color={colors.white} strokeWidth={2} />
          <Text style={styles.addToCartText}>
            {addedToCart ? 'Go to Bag →' : addingToCart ? 'Adding...' : stock > 0 ? 'Add to Bag' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailRow({ label, value, even, colors }: { label: string; value: string | null | undefined; even: boolean; colors: ColorPalette }) {
  if (!value) return null;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.detailRow, even && styles.detailRowEven]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DeliveryItem({ icon, title, sub, colors }: { icon: React.ReactNode; title: string; sub: string; colors: ColorPalette }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
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

const createStyles = (colors: ColorPalette) => StyleSheet.create({
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
    backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },

  // Hero
  heroWrap: { paddingHorizontal: spacing.margin, paddingBottom: spacing.sm },
  heroImage: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: borderRadius.md,
    overflow: 'hidden', backgroundColor: colors.placeholder, position: 'relative',
  },
  heroPlaceholder: { ...StyleSheet.absoluteFill, backgroundColor: colors.surfaceMuted },
  giBadge: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surfaceOverlay, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  giDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  giText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textPrimary, letterSpacing: 1 },

  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.borderMedium },
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
    backgroundColor: colors.errorBg, paddingHorizontal: 10, paddingVertical: 4,
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
    backgroundColor: colors.warningBg, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  discountText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accentDark },
  taxNote: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 6 },

  // Shared
  divider: { height: 1, backgroundColor: colors.borderMedium },
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
    borderRadius: 8, backgroundColor: colors.surfaceMuted,
  },
  pinCheckText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary },
  pinResults: {
    marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: colors.surfaceAlt, gap: 6,
  },
  pinResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinResultText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.success },

  // Details Table
  detailsTable: {
    borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  detailRowEven: { backgroundColor: colors.surfaceAlt },
  detailLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  detailValue: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textPrimary },

  // Delivery
  deliveryItems: { gap: 12 },
  deliveryItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deliveryIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt,
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
  relatedMetaLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },
  relatedScroll: { paddingHorizontal: spacing.margin, gap: 12 },
  relatedCard: {
    width: 160, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  relatedImage: { width: '100%', aspectRatio: 3 / 4, backgroundColor: colors.placeholder },
  relatedMeta2: { padding: 10 },
  relatedOrigin: {
    fontFamily: 'DMSans-SemiBold', fontSize: 10, color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
  },
  relatedName: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  relatedPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.accent, marginTop: 4, letterSpacing: -0.3 },

  // Toast
  toast: {
    position: 'absolute', bottom: 100, left: spacing.margin, right: spacing.margin,
    backgroundColor: colors.toastBg,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    zIndex: 50,
  },
  toastText: {
    fontFamily: 'DMSans-SemiBold', fontSize: 14, color: '#fff', letterSpacing: -0.1,
  },

  // Sticky Bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.stickyBar,
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
    backgroundColor: colors.primaryDark, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  addToCartSuccess: { backgroundColor: colors.success },
  addToCartDisabled: { opacity: 0.4 },
  addToCartText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
});
