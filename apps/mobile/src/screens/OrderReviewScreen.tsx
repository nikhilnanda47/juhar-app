import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Truck, Phone, ArrowRight, Package, BadgeCheck, Handshake } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { getAddresses, getCart, formatPaise, type Address, type CartResponse } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://api.juhar.in';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('juhar_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

interface Props {
  navigation: any;
  route: { params: { addressId: string } };
}

export default function OrderReviewScreen({ navigation, route }: Props) {
  const { addressId } = route.params;
  const [address, setAddress] = useState<Address | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [paymentMode] = useState<'cod'>('cod');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [addrs, cartData] = await Promise.all([getAddresses(), getCart()]);
      setAddress(addrs.find((a) => a.id === addressId) || null);
      setCart(cartData);
    } catch {}
    setLoading(false);
  };

  const shippingPaise = (cart?.subtotalPaise ?? 0) >= 500000 ? 0 : 9900;
  const totalPaise = (cart?.subtotalPaise ?? 0) + shippingPaise;

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const order = await apiRequest<any>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ addressId, paymentMode, idempotencyKey }),
      });
      navigation.replace('OrderSuccess', { order });
    } catch (err: any) {
      Alert.alert('Order Failed', err.message || 'Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!cart || cart.items.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>Your cart is empty</Text></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Delivering To */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivering to</Text>
          <View style={styles.verifiedBadge}>
            <Truck size={14} color={colors.accent} strokeWidth={2} />
            <Text style={styles.verifiedText}>VERIFIED ADDRESS</Text>
          </View>
        </View>
        {address && (
          <View style={styles.card}>
            <View style={styles.addrRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addrName}>{address.recipientName}</Text>
                <Text style={styles.addrLine}>
                  {[address.line1, address.line2, address.landmark, `${address.city}, ${address.pinCode}`].filter(Boolean).join(', ')}
                </Text>
                <View style={styles.phoneRow}>
                  <Phone size={14} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={styles.phoneText}>{address.recipientPhone}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.changeBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.changeBtnText}>Change</Text>
                <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Items */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items ({cart.itemCount})</Text>
          <Text style={styles.sectionMeta}>Western Odisha Looms</Text>
        </View>
        <View style={styles.card}>
          {cart.items.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemThumb} />
                <View style={styles.itemDetails}>
                  <View style={styles.itemNameRow}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.variant.productTitle}</Text>
                    <Text style={styles.itemPrice}>{formatPaise(item.lineTotalPaise)}</Text>
                  </View>
                  <Text style={styles.itemMeta}>
                    {[item.variant.color, `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={styles.clusterRow}>
                    <View style={styles.clusterDot} />
                    <Text style={styles.clusterText}>Sambalpuri Cluster</Text>
                  </View>
                </View>
              </View>
              {idx < cart.items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        {/* Payment */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Payment</Text>
        <View style={styles.card}>
          {/* COD Selected */}
          <View style={styles.paymentRow}>
            <View style={styles.paymentLeft}>
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
              <View>
                <Text style={styles.paymentLabel}>Cash on Delivery</Text>
                <Text style={styles.paymentSub}>Pay when you receive</Text>
              </View>
            </View>
          </View>
          <View style={styles.paymentDivider} />
          {/* UPI Disabled */}
          <View style={[styles.paymentRow, { opacity: 0.4 }]}>
            <View style={styles.paymentLeft}>
              <View style={styles.radioOuterEmpty} />
              <View>
                <Text style={styles.paymentLabel}>UPI</Text>
                <Text style={styles.paymentSub}>Coming soon</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Details */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Price Details</Text>
        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal ({cart.itemCount} items)</Text>
            <Text style={styles.priceValue}>{formatPaise(cart.subtotalPaise)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Shipping</Text>
            <Text style={shippingPaise === 0 ? styles.priceAccent : styles.priceValue}>
              {shippingPaise === 0 ? 'FREE' : formatPaise(shippingPaise)}
            </Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPaise(totalPaise)}</Text>
          </View>
        </View>

        {/* Delivery Estimate */}
        <View style={styles.deliveryNotice}>
          <Package size={16} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={styles.deliveryNoticeText}>
            Estimated delivery <Text style={styles.deliveryNoticeDate}>22–26 Nov 2026</Text>
          </Text>
        </View>

        {/* Trust Footer */}
        <View style={styles.trustFooter}>
          <Handshake size={14} color={colors.accent} strokeWidth={1.5} />
          <Text style={styles.trustText}>Direct fair-trade remuneration guaranteed to weavers</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom */}
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>To Pay</Text>
          <Text style={styles.stickyPrice}>{formatPaise(totalPaise)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeBtn, placing && { opacity: 0.5 }]}
          onPress={handlePlaceOrder}
          disabled={placing}
          activeOpacity={0.85}
        >
          <Text style={styles.placeBtnText}>
            {placing ? 'Securing Order...' : 'Place Order'}
          </Text>
          <Text style={styles.placeBtnPrice}>({formatPaise(totalPaise)})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.margin, paddingBottom: 120 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, marginTop: spacing.lg,
  },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionMeta: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },

  // Address
  addrRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  addrName: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  addrLine: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  phoneText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  changeBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.primary, letterSpacing: -0.2 },

  // Items
  itemRow: { flexDirection: 'row', gap: 12, paddingVertical: 8 },
  itemThumb: { width: 60, height: 80, borderRadius: 8, backgroundColor: '#E0DDD8' },
  itemDetails: { flex: 1 },
  itemNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 },
  itemName: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, flex: 1, letterSpacing: -0.2 },
  itemPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.accent, letterSpacing: -0.3 },
  itemMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  clusterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  clusterText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 0.3 },
  itemDivider: { height: 1, backgroundColor: '#EEEEEB', marginVertical: 4 },

  // Payment
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#E2E3E0',
    justifyContent: 'center', alignItems: 'center', padding: 3,
  },
  radioInner: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.primary },
  radioOuterEmpty: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E2E3E0' },
  paymentLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  paymentSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  paymentDivider: { height: 1, backgroundColor: '#EEEEEB' },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  priceValue: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary },
  priceAccent: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.accent },
  priceDivider: { height: 1, backgroundColor: '#EEEEEB', marginVertical: 8 },
  totalLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary },
  totalValue: { fontFamily: 'DMSans-SemiBold', fontSize: 20, color: colors.textPrimary, letterSpacing: -0.4 },

  // Delivery Notice
  deliveryNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F4F4F1', borderRadius: borderRadius.md, padding: spacing.md,
    marginTop: spacing.lg,
  },
  deliveryNoticeText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  deliveryNoticeDate: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary },

  // Trust Footer
  trustFooter: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
    marginTop: spacing.md, paddingBottom: spacing.sm,
  },
  trustText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.3 },

  // Sticky
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.margin, paddingVertical: 10, paddingBottom: 28,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 5,
  },
  stickyLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textTertiary, letterSpacing: 1 },
  stickyPrice: { fontFamily: 'DMSans-Bold', fontSize: 20, color: colors.textPrimary, letterSpacing: -0.4 },
  placeBtn: {
    flex: 1, height: 48, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  placeBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
  placeBtnPrice: { fontFamily: 'DMSans-Regular', fontSize: 16, color: colors.white, opacity: 0.9 },
});
