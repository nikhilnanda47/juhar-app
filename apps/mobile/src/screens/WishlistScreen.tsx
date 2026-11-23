// @ts-nocheck
import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Heart, Trash2, ShoppingBag, ChevronLeft } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import { addToCart, formatPaise, isLoggedIn } from '../services/api';
import { useWishlist } from '../contexts/WishlistContext';

interface Props {
  navigation: any;
}

export default function WishlistScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { wishlistItems, toggleWishlist, total } = useWishlist();

  if (!isLoggedIn()) {
    return (
      <View style={styles.center}>
        <Heart size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Sign in to see your saved items</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.ctaBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAddToCart = async (variantId: string) => {
    try { await addToCart(variantId, 1); } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Saved Items</Text>
          <Text style={styles.headerSub}>{total} {total === 1 ? 'item' : 'items'}</Text>
        </View>
      </View>

      {total === 0 ? (
        <View style={styles.center}>
          <Heart size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No saved items yet</Text>
          <Text style={styles.emptySubtext}>Tap the heart on any saree to save it here</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.ctaBtnText}>Browse Sarees</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {wishlistItems.map((item) => {
            const v = item.variant;
            const p = v.product;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.row}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Shop', { screen: 'ProductDetail', params: { slug: p.slug } })}
              >
                <View style={styles.rowImage} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{p.title}</Text>
                  <Text style={styles.rowSub}>{v.color || v.name || p.origin || ''}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatPaise(v.pricePaise)}</Text>
                    {v.compareAtPaise && v.compareAtPaise > v.pricePaise && (
                      <Text style={styles.comparePrice}>{formatPaise(v.compareAtPaise)}</Text>
                    )}
                  </View>
                  {!v.isAvailable && <Text style={styles.outOfStock}>Out of Stock</Text>}
                  <View style={styles.rowActions}>
                    {v.isAvailable && (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => handleAddToCart(v.id)}
                      >
                        <ShoppingBag size={14} color="#fff" strokeWidth={2} />
                        <Text style={styles.addBtnText}>Add to Bag</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => toggleWishlist(v.id)}
                    >
                      <Trash2 size={16} color={colors.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingTop: 56, paddingBottom: 16, paddingHorizontal: spacing.margin,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.surfaceContainerLow,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: 'NotoSerif-Medium', fontSize: 20, color: colors.textPrimary,
    },
    headerSub: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.textTertiary, marginTop: 1 },
    emptyTitle: {
      fontFamily: 'NotoSerif-Regular', fontSize: 18, color: colors.textPrimary,
      marginTop: 16, marginBottom: 8, textAlign: 'center',
    },
    emptySubtext: {
      fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary,
      textAlign: 'center', marginBottom: 24,
    },
    ctaBtn: {
      paddingHorizontal: 28, paddingVertical: 12,
      backgroundColor: colors.primary, borderRadius: borderRadius.md,
    },
    ctaBtnText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: '#fff' },
    list: { padding: spacing.margin },
    row: {
      flexDirection: 'row', gap: 12, marginBottom: 16,
      backgroundColor: colors.surface, borderRadius: borderRadius.lg,
      padding: 12, borderWidth: 1, borderColor: colors.border,
    },
    rowImage: {
      width: 80, aspectRatio: 0.75, borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceContainerLow,
    },
    rowInfo: { flex: 1 },
    rowTitle: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary },
    rowSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
    price: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.accent },
    comparePrice: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary, textDecorationLine: 'line-through' },
    outOfStock: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.error, marginTop: 4 },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    addBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, height: 32, borderRadius: borderRadius.sm, backgroundColor: colors.primary,
    },
    addBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#fff' },
    removeBtn: {
      width: 32, height: 32, borderRadius: borderRadius.sm,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
