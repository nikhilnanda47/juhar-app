import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Package, User, ArrowRight } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { loadToken, formatPaise } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://api.sajani.in';

async function fetchOrders() {
  const token = await AsyncStorage.getItem('sajani_token');
  if (!token) return [];
  const res = await fetch(`${API_BASE}/api/v1/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.success ? json.data.items : [];
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  placed: { bg: '#E8E8E5', text: colors.primary },
  confirmed: { bg: '#FFF8E1', text: '#F57F17' },
  packed: { bg: '#FFF3E0', text: '#E65100' },
  shipped: { bg: '#FFF3E0', text: '#E65100' },
  delivered: { bg: 'rgba(255,218,171,0.4)', text: '#795E38' },
  cancelled: { bg: '#FCE4EC', text: '#C62828' },
};

interface Props { navigation: any; }

export default function OrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useFocusEffect(useCallback(() => { checkAndLoad(); }, []));

  const checkAndLoad = async () => {
    const hasToken = await loadToken();
    setLoggedIn(hasToken);
    if (hasToken) setOrders(await fetchOrders());
    setLoading(false);
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!loggedIn) {
    return (
      <View style={styles.center}>
        <User size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Log in to view orders</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.primaryBtnText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.center}>
        <Package size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No orders yet</Text>
        <Text style={styles.emptySubtext}>Your orders will appear here.</Text>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('Shop')}>
          <Text style={styles.outlineBtnText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); checkAndLoad(); }} tintColor={colors.primary} />}
    >
      {/* Page Title */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Orders</Text>
      </View>

      {/* Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryLeft}>
          <Package size={18} color={colors.accent} strokeWidth={2} />
          <Text style={styles.summaryText}>{orders.length} Handcrafted Orders</Text>
        </View>
        <Text style={styles.summaryLabel}>ARTISAN CERTIFIED</Text>
      </View>

      {/* Order Cards */}
      {orders.map((order: any) => {
        const sc = STATUS_STYLES[order.status] || STATUS_STYLES.placed;
        const firstItem = order.items?.[0];
        const moreCount = (order.itemCount || order.items?.length || 0) - 1;

        return (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
            activeOpacity={0.9}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderNumber}>{order.publicNumber}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusText, { color: sc.text }]}>
                  {order.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Item Preview */}
            <View style={styles.itemPreview}>
              <View style={styles.itemThumb} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {firstItem?.productTitle || 'Handloom Saree'}
                </Text>
                <Text style={styles.itemMeta}>
                  {firstItem?.variantName || ''} · Qty: {firstItem?.qty || 1}
                </Text>
                {moreCount > 0 && (
                  <Text style={styles.moreItems}>+{moreCount} more item{moreCount > 1 ? 's' : ''}</Text>
                )}
              </View>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.totalLabel}>ORDER TOTAL</Text>
                <Text style={styles.totalValue}>{formatPaise(order.totalPaise)}</Text>
              </View>
              <View style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ArrowRight size={16} color={colors.primary} strokeWidth={2} />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Support Note */}
      <View style={styles.supportNote}>
        <View style={styles.supportBar} />
        <Text style={styles.supportText}>
          Showing all {orders.length} orders · Need help with an order?
        </Text>
        <TouchableOpacity>
          <Text style={styles.supportLink}>Contact support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.margin, paddingBottom: 100 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, paddingHorizontal: spacing.xl, gap: 8,
  },
  emptyTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary, marginTop: spacing.md },
  emptySubtext: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },
  primaryBtn: {
    marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 6,
    paddingVertical: 12, paddingHorizontal: 32,
  },
  primaryBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  outlineBtn: {
    marginTop: spacing.md, borderWidth: 1, borderColor: colors.primary,
    borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32,
  },
  outlineBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },

  // Header
  header: { paddingTop: 56, marginBottom: spacing.md },
  pageTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 22, color: colors.textPrimary, letterSpacing: -0.2 },

  // Summary Banner
  summaryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    backgroundColor: '#F4F4F1', borderRadius: borderRadius.md, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textSecondary },
  summaryLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },

  // Order Card
  orderCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },

  // Card Header
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  orderDate: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  statusText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },

  // Item Preview
  itemPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(244,244,241,0.5)', padding: 4, borderRadius: 8,
    marginTop: spacing.md,
  },
  itemThumb: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#E0DDD8' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary },
  itemMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  moreItems: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.primary, marginTop: 4 },

  // Card Footer
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.md, paddingTop: spacing.sm,
  },
  totalLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textTertiary, letterSpacing: 1 },
  totalValue: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.3 },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewDetailsText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.primary, letterSpacing: 0.2 },

  // Support Note
  supportNote: { alignItems: 'center', marginTop: spacing.md, gap: 4 },
  supportBar: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E8E8E5', marginBottom: 4 },
  supportText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  supportLink: {
    fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.primary,
    textDecorationLine: 'underline',
  },
});
