import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ShoppingBag, Trash2, Heart, Minus, Plus, Package,
  ChevronLeft, Truck, ArrowRight, X, BadgeCheck, Leaf,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, elevation } from '../theme';
import {
  isLoggedIn, loadToken, getCart, updateCartItem, removeCartItem, formatPaise,
  type CartResponse, type CartItemResponse,
} from '../services/api';

const FREE_SHIPPING_THRESHOLD = 500000; // 5000 paise = ₹5,000

export default function CartScreen() {
  const navigation = useNavigation<any>();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { checkAndLoad(); }, []));

  const checkAndLoad = async () => {
    const hasToken = await loadToken();
    setLoggedIn(hasToken);
    if (hasToken) await loadCart();
    else setLoading(false);
  };

  const loadCart = async () => {
    try { setCart(await getCart()); } catch { setCart({ items: [], subtotalPaise: 0, itemCount: 0 }); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    setUpdating(itemId);
    try {
      const data = newQty <= 0 ? await removeCartItem(itemId) : await updateCartItem(itemId, newQty);
      setCart(data);
    } catch {}
    setUpdating(null);
  };

  const handleRemove = async (itemId: string) => {
    setUpdating(itemId);
    try { setCart(await removeCartItem(itemId)); } catch {}
    setUpdating(null);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!loggedIn) {
    return (
      <View style={styles.center}>
        <ShoppingBag size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Your bag is empty</Text>
        <Text style={styles.emptySubtext}>Log in to start adding sarees.</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.outlineBtnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.center}>
        <ShoppingBag size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Your bag is empty</Text>
        <Text style={styles.emptySubtext}>Browse our collection and add something you love.</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Shop')}>
          <Text style={styles.outlineBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shippingPaise = cart.subtotalPaise >= FREE_SHIPPING_THRESHOLD ? 0 : 9900;
  const couponDiscount = appliedCoupon ? 10000 : 0; // ₹100 mock
  const totalPaise = cart.subtotalPaise - couponDiscount + shippingPaise;
  const freeShippingMet = cart.subtotalPaise >= FREE_SHIPPING_THRESHOLD;
  const shippingProgress = Math.min(100, (cart.subtotalPaise / FREE_SHIPPING_THRESHOLD) * 100);
  const totalSavings = cart.items.reduce((sum, item) => {
    const compare = item.variant.compareAtPaise || item.variant.pricePaise;
    return sum + (compare - item.variant.pricePaise) * item.quantity;
  }, 0) + couponDiscount + (shippingPaise === 0 ? 9900 : 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCart(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ChevronLeft size={20} color={colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Bag ({cart.itemCount})</Text>
          </View>
        </View>

        {/* Free Shipping Meter */}
        <View style={styles.shippingMeter}>
          <View style={styles.shippingRow}>
            <View style={styles.shippingLeft}>
              <Truck size={16} color={colors.accent} strokeWidth={2} />
              <Text style={styles.shippingText}>
                {freeShippingMet
                  ? 'Free delivery unlocked!'
                  : `₹${((FREE_SHIPPING_THRESHOLD - cart.subtotalPaise) / 100).toLocaleString('en-IN')} more for free shipping`
                }
              </Text>
            </View>
            {freeShippingMet && <Text style={styles.shippingGoal}>₹5,000 met</Text>}
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${shippingProgress}%` }]} />
          </View>
        </View>

        {/* Cart Items */}
        {cart.items.map((item) => (
          <CartItemCard
            key={item.id}
            item={item}
            updating={updating === item.id}
            onIncrement={() => handleUpdateQty(item.id, item.quantity + 1)}
            onDecrement={() => handleUpdateQty(item.id, item.quantity - 1)}
            onRemove={() => handleRemove(item.id)}
          />
        ))}

        {/* Coupon Section */}
        <View style={styles.couponSection}>
          <View style={styles.couponHeader}>
            <Text style={styles.couponTitle}>Offers & Coupons</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.appliedCoupon}>
              <BadgeCheck size={20} color={colors.accent} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.appliedCode}>{appliedCoupon} applied (−₹100)</Text>
                <Text style={styles.appliedDesc}>First purchase discount</Text>
              </View>
              <TouchableOpacity onPress={() => setAppliedCoupon(null)}>
                <X size={16} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.couponInputRow}>
            <TextInput
              style={styles.couponInput}
              value={couponCode}
              onChangeText={(t) => setCouponCode(t.toUpperCase())}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.couponApplyBtn}
              onPress={() => { if (couponCode.length >= 3) { setAppliedCoupon(couponCode); setCouponCode(''); } }}
            >
              <Text style={styles.couponApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Details */}
        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>Price Details ({cart.itemCount} Items)</Text>
          <PriceRow label={`Subtotal (${cart.itemCount} items)`} value={formatPaise(cart.subtotalPaise)} />
          {appliedCoupon && (
            <PriceRow label={`Coupon (${appliedCoupon})`} value={`−${formatPaise(couponDiscount)}`} valueColor={colors.accent} />
          )}
          <PriceRow
            label="Shipping"
            value={shippingPaise === 0 ? 'FREE' : formatPaise(shippingPaise)}
            valueColor={shippingPaise === 0 ? colors.accent : undefined}
          />
          <View style={styles.priceDivider} />
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalTaxNote}>Inclusive of all taxes</Text>
            </View>
            <Text style={styles.totalValue}>{formatPaise(totalPaise)}</Text>
          </View>
          {freeShippingMet && (
            <View style={styles.freeShipNote}>
              <Leaf size={16} color={colors.accent} strokeWidth={2} />
              <Text style={styles.freeShipText}>Free shipping applied on orders above ₹5,000</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyLeft}>
          <Text style={styles.stickyLabel}>PAYABLE TOTAL</Text>
          <View style={styles.stickyPriceRow}>
            <Text style={styles.stickyPrice}>{formatPaise(totalPaise)}</Text>
            {totalSavings > 0 && (
              <Text style={styles.stickySaved}>Saved {formatPaise(totalSavings)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SelectAddress')}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <ArrowRight size={18} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CartItemCard({
  item, updating, onIncrement, onDecrement, onRemove,
}: {
  item: CartItemResponse; updating: boolean;
  onIncrement: () => void; onDecrement: () => void; onRemove: () => void;
}) {
  const discount = item.variant.compareAtPaise && item.variant.compareAtPaise > item.variant.pricePaise
    ? Math.round((1 - item.variant.pricePaise / item.variant.compareAtPaise) * 100) : null;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemRow}>
        {/* Thumbnail */}
        <View style={styles.itemThumb}>
          <View style={styles.thumbPlaceholder} />
        </View>

        {/* Details */}
        <View style={styles.itemDetails}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.variant.productTitle}</Text>
            <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={18} color={colors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
          <Text style={styles.itemVariant}>
            {[item.variant.color ? `Color: ${item.variant.color}` : null, item.variant.name].filter(Boolean).join(' • ')}
          </Text>
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemPrice}>{formatPaise(item.variant.pricePaise)}</Text>
            {item.variant.compareAtPaise && item.variant.compareAtPaise > item.variant.pricePaise && (
              <Text style={styles.itemCompare}>{formatPaise(item.variant.compareAtPaise)}</Text>
            )}
            {discount && <Text style={styles.itemDiscount}>{discount}% off</Text>}
          </View>
          <View style={styles.deliveryRow}>
            <Package size={14} color={colors.accent} strokeWidth={2} />
            <Text style={styles.deliveryText}>Delivery by 5–7 days</Text>
          </View>
        </View>
      </View>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={onDecrement}
            disabled={updating}
          >
            <Minus size={14} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.stepQty}>{updating ? '…' : item.quantity}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={onIncrement} disabled={updating}>
            <Plus size={14} color={colors.textPrimary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.wishlistLink}>
          <Heart size={16} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.wishlistText}>Save to Wishlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PriceRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, valueColor ? { color: valueColor, fontFamily: 'DMSans-SemiBold' } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.margin, paddingBottom: 140 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, paddingHorizontal: spacing.xl, gap: 8,
  },
  emptyTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary, marginTop: spacing.md },
  emptySubtext: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  outlineBtn: {
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.primary,
    borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32,
  },
  outlineBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 48, paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEEEEB',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },

  // Free Shipping Meter
  shippingMeter: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  shippingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shippingLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  shippingText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.accent },
  shippingGoal: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.accent },
  progressBar: { width: '100%', height: 6, backgroundColor: '#E8E8E5', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },

  // Item Card
  itemCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.gutter,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  itemRow: { flexDirection: 'row', gap: 12 },
  itemThumb: { width: 80, height: 106, borderRadius: 6, overflow: 'hidden', backgroundColor: '#E0DDD8' },
  thumbPlaceholder: { flex: 1, backgroundColor: '#D5CFC9' },
  itemDetails: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 },
  itemTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.textPrimary, flex: 1, letterSpacing: -0.2 },
  itemVariant: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  itemPrice: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.3 },
  itemCompare: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary, textDecorationLine: 'line-through' },
  itemDiscount: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.primary, marginLeft: 4 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  deliveryText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },

  // Action Row
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, paddingTop: 8, paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: 'rgba(244,244,241,0.5)', borderRadius: 8,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', height: 32,
    backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  stepBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  stepQty: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textPrimary, width: 32, textAlign: 'center' },
  wishlistLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  wishlistText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary, letterSpacing: 0.2 },

  // Coupon
  couponSection: { marginTop: spacing.md, marginBottom: spacing.md },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  couponTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  appliedCoupon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,218,171,0.3)', padding: 10, borderRadius: 8, marginBottom: 8,
  },
  appliedCode: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.5 },
  appliedDesc: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.textSecondary },
  couponInputRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1, height: 48, backgroundColor: colors.surface, borderRadius: 6,
    paddingHorizontal: 14, fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary,
    letterSpacing: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  couponApplyBtn: {
    height: 48, paddingHorizontal: 20, backgroundColor: '#EEEEEB', borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  couponApplyText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary },

  // Price Card
  priceCard: {
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  priceCardTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, marginBottom: 10, letterSpacing: -0.2 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  priceValue: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary },
  priceDivider: { height: 1, backgroundColor: '#E8E8E5', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  totalLabel: { fontFamily: 'DMSans-Bold', fontSize: 16, color: colors.textPrimary },
  totalTaxNote: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  totalValue: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary },
  freeShipNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F4F1', padding: 10, borderRadius: 8, marginTop: 10,
  },
  freeShipText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.accent },

  // Sticky Bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(249,249,246,0.95)',
    paddingHorizontal: spacing.margin, paddingVertical: 12, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 5,
  },
  stickyLeft: { flexShrink: 0 },
  stickyLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 10, color: colors.textTertiary, letterSpacing: 1.5 },
  stickyPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  stickyPrice: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary },
  stickySaved: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent },
  checkoutBtn: {
    flex: 1, height: 48, borderRadius: 6, backgroundColor: colors.primary,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  checkoutBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
});
