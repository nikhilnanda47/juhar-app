import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Alert, RefreshControl,
} from 'react-native';
import {
  Check, Truck, MapPin, Phone, MessageCircle, ArrowRight, Copy, Info,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { formatPaise } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://api.sajani.in';

async function fetchOrderDetail(orderId: string) {
  const token = await AsyncStorage.getItem('sajani_token');
  const res = await fetch(`${API_BASE}/api/v1/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message);
  return json.data;
}

const TIMELINE_STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  placed: 'Order Placed', confirmed: 'Confirmed', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered',
};

interface Props { navigation: any; route: { params: { orderId: string } }; }

export default function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [orderId]);
  const load = async () => {
    try { setOrder(await fetchOrderDetail(orderId)); } catch {}
    setLoading(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!order) return <View style={styles.center}><Text style={styles.errorText}>Order not found</Text></View>;

  const currentIdx = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const addr = order.addressSnapshot;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          try { setOrder(await fetchOrderDetail(orderId)); } catch {}
          setRefreshing(false);
        }} tintColor={colors.primary} />
      }
    >
      {/* Sub-bar */}
      <View style={styles.subBar}>
        <View style={styles.subBarLeft}>
          <View style={styles.codBadge}><Text style={styles.codText}>COD Order</Text></View>
          <Text style={styles.subBarDot}>·</Text>
          <Text style={styles.subBarDate}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* 1. Order Status */}
      <SectionTitle title="Order Status" />
      <View style={styles.card}>
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledText}>Order Cancelled</Text>
            {order.cancellationReason && <Text style={styles.cancelReason}>{order.cancellationReason}</Text>}
          </View>
        ) : (
          <View>
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = idx <= currentIdx;
              const isFuture = idx > currentIdx;
              const isLast = idx === TIMELINE_STEPS.length - 1;
              const timestamp = order[`${step === 'placed' ? 'created' : step}At`];
              return (
                <View key={step} style={styles.timelineRow}>
                  {/* Left: node + line */}
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineNode,
                      isDone && styles.nodeComplete,
                    ]}>
                      {isDone && <Check size={13} color="#fff" strokeWidth={3} />}
                      {isFuture && <View style={styles.nodeFutureDot} />}
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                    )}
                  </View>
                  {/* Right: details */}
                  <View style={[styles.timelineContent, isFuture && { opacity: 0.5 }]}>
                    <View style={styles.timelineContentRow}>
                      <Text style={[styles.stepLabel, (idx === currentIdx) && styles.stepLabelCurrent]}>
                        {STEP_LABELS[step]}
                      </Text>
                      {timestamp && (
                        <Text style={styles.stepTime}>
                          {new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* 2. Tracking */}
      {order.shipments?.length > 0 && (
        <>
          <SectionTitle title="Tracking Information" />
          <View style={styles.card}>
            {order.shipments.map((s: any) => (
              <View key={s.id}>
                <View style={styles.trackingHeader}>
                  <View style={styles.trackingIconWrap}>
                    <Truck size={20} color={colors.accent} strokeWidth={1.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackingLabel}>Courier Partner</Text>
                    <Text style={styles.trackingCarrier}>{s.carrier}</Text>
                  </View>
                </View>
                <View style={styles.trackingIdBox}>
                  <View>
                    <Text style={styles.trackingIdLabel}>TRACKING CONSIGNMENT NO.</Text>
                    <Text style={styles.trackingId}>{s.trackingId}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => Alert.alert('Tracking ID', s.trackingId)}
                  >
                    <Text style={styles.copyBtnText}>Copy</Text>
                    <Copy size={14} color={colors.primary} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 3. Items */}
      <SectionTitle title={`Items (${order.items?.length || 0})`} />
      <View style={styles.card}>
        {order.items?.map((item: any, idx: number) => (
          <View key={item.id}>
            <View style={styles.itemRow}>
              <View style={styles.itemThumb} />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={1}>{item.productTitle}</Text>
                <Text style={styles.itemMeta}>{item.variantName || item.sku}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemQty}>{item.variantName?.split(' ')[0] || ''} · Qty: {item.qty}</Text>
                  <Text style={styles.itemPrice}>{formatPaise(item.totalPaise)}</Text>
                </View>
              </View>
            </View>
            {idx < order.items.length - 1 && <View style={styles.itemDivider} />}
          </View>
        ))}
      </View>

      {/* 4. Delivery Address */}
      {addr && (
        <>
          <SectionTitle title="Delivery Address" />
          <View style={styles.card}>
            <View style={styles.addrRow}>
              <View style={styles.addrIconWrap}>
                <MapPin size={20} color={colors.primary} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.addrNameRow}>
                  <Text style={styles.addrName}>{addr.recipientName}</Text>
                  <View style={styles.addrLabelBadge}>
                    <Text style={styles.addrLabelText}>HOME</Text>
                  </View>
                </View>
                <Text style={styles.addrLine}>
                  {[addr.line1, addr.line2, addr.landmark].filter(Boolean).join(', ')}
                </Text>
                <Text style={styles.addrLine}>
                  {addr.city}, {addr.state} — {addr.pinCode}
                </Text>
                <View style={styles.addrPhoneRow}>
                  <Phone size={14} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={styles.addrPhone}>{addr.recipientPhone}</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      )}

      {/* 5. Payment Summary */}
      <SectionTitle title="Payment Summary" />
      <View style={styles.card}>
        <View style={styles.payModeRow}>
          <Text style={styles.payModeLabel}>Payment Method</Text>
          <View style={styles.payModeBadge}>
            <Text style={styles.payModeText}>
              {order.paymentMode === 'cod' ? 'Cash on Delivery' : 'UPI'}
            </Text>
          </View>
        </View>
        <View style={styles.payDivider} />
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Subtotal ({order.items?.length || 0} items)</Text>
          <Text style={styles.payValue}>{formatPaise(order.subtotalPaise)}</Text>
        </View>
        <View style={styles.payRow}>
          <Text style={styles.payLabel}>Shipping</Text>
          <Text style={order.shippingPaise === 0 ? styles.payFree : styles.payValue}>
            {order.shippingPaise === 0 ? 'FREE' : formatPaise(order.shippingPaise)}
          </Text>
        </View>
        <View style={styles.payDivider} />
        <View style={styles.payTotalRow}>
          <View>
            <Text style={styles.payTotalLabel}>Total to Pay</Text>
            <Text style={styles.payTotalSub}>Pay cash or UPI on handover</Text>
          </View>
          <Text style={styles.payTotalValue}>{formatPaise(order.totalPaise)}</Text>
        </View>
      </View>

      {/* 6. WhatsApp Support */}
      <View style={styles.supportCard}>
        <View style={styles.supportLeft}>
          <View style={styles.supportIconWrap}>
            <MessageCircle size={24} color="#128C7E" strokeWidth={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Need help with this order?</Text>
            <Text style={styles.supportSub}>Chat with weaver support on WhatsApp</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => Linking.openURL(`https://wa.me/919876543210?text=Order%20${order.publicNumber}`)}
        >
          <Text style={styles.supportBtnText}>Open</Text>
          <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.margin, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.error },

  // Sub-bar
  subBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  subBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codBadge: { backgroundColor: 'rgba(255,218,171,0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  codText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#795E38', letterSpacing: 0.5 },
  subBarDot: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },
  subBarDate: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },

  sectionTitle: {
    fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary,
    marginTop: spacing.xl, marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },

  // Timeline
  timelineRow: { flexDirection: 'row', minHeight: 52 },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineNode: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEEEEB',
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  nodeComplete: { backgroundColor: '#3D8B63' },
  nodeCurrent: { backgroundColor: 'rgba(255,210,221,1)' },
  nodePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  nodeFutureDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9C1C3' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#E8E8E5', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#3D8B63' },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  timelineContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  stepLabelCurrent: { color: colors.primary },
  stepTime: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },

  // Cancelled
  cancelledBanner: { backgroundColor: '#FCE4EC', borderRadius: 8, padding: 12 },
  cancelledText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#C62828' },
  cancelReason: { fontFamily: 'DMSans-Regular', fontSize: 13, color: '#C62828', marginTop: 4 },

  // Tracking
  trackingHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  trackingIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center',
  },
  trackingLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textTertiary, letterSpacing: 0.2 },
  trackingCarrier: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  trackingIdBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F4F4F1', borderRadius: borderRadius.md, padding: 10,
  },
  trackingIdLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textTertiary, letterSpacing: 1.5 },
  trackingId: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: 1, marginTop: 2 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  copyBtnText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.primary },

  // Items
  itemRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  itemThumb: { width: 60, height: 80, borderRadius: 8, backgroundColor: '#E0DDD8' },
  itemDetails: { flex: 1, justifyContent: 'space-between' },
  itemName: { fontFamily: 'DMSans-Medium', fontSize: 16, color: colors.textPrimary },
  itemMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  itemQty: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  itemPrice: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.primary, letterSpacing: -0.3 },
  itemDivider: { height: 1, backgroundColor: '#EEEEEB' },

  // Address
  addrRow: { flexDirection: 'row', gap: 12 },
  addrIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center',
  },
  addrNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrName: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  addrLabelBadge: { backgroundColor: '#EEEEEB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  addrLabelText: { fontFamily: 'DMSans-SemiBold', fontSize: 10, color: colors.textTertiary, letterSpacing: 1 },
  addrLine: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, marginTop: 4, lineHeight: 22 },
  addrPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  addrPhone: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },

  // Payment
  payModeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  payModeLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },
  payModeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,218,171,0.4)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  payModeText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#795E38', letterSpacing: 0.3 },
  payDivider: { height: 1, backgroundColor: '#EEEEEB', marginVertical: 8 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  payLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  payValue: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary },
  payFree: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#3D8B63', letterSpacing: 1, textTransform: 'uppercase' },
  payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  payTotalLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  payTotalSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  payTotalValue: { fontFamily: 'DMSans-Bold', fontSize: 20, color: colors.primary, letterSpacing: -0.4 },

  // Support
  supportCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    marginTop: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  supportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  supportIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(37,211,102,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  supportTitle: { fontFamily: 'DMSans-Medium', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  supportSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F4F4F1', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  supportBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.primary },
});
