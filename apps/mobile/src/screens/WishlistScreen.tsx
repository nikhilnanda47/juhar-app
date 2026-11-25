import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Heart, Trash2, ShoppingBag, ChevronLeft } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import { addToCart, getCart, formatPaise, isLoggedIn, referenceOf } from '../services/api';
import { onCartChanged } from '../services/cartEvents';
import { useWishlist } from '../contexts/WishlistContext';
import { showAlert } from '../utils/showAlert';

interface Props {
  navigation: any;
}

export default function WishlistScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { loaded, items, toggleVariant, total, refreshWishlist } = useWishlist();
  const [addingId, setAddingId] = useState<string | null>(null);
  // Which of these are in the bag right now. It is read from the bag itself, so "Go to Bag" goes away
  // when the bag is emptied somewhere else instead of staying until the app restarts.
  const [inBag, setInBag] = useState<Set<string>>(new Set());

  // Opening the screen always asks again, so it is never older than the last time the customer looked
  useFocusEffect(useCallback(() => { refreshWishlist(); }, [refreshWishlist]));

  const readBag = useCallback(() => {
    if (!isLoggedIn()) return Promise.resolve();
    return getCart().then((cart) => setInBag(new Set(cart.items.map((i) => i.variant.id)))).catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => { readBag(); }, [readBag])); // coming back to this screen
  useEffect(() => onCartChanged(() => { readBag(); }), [readBag]); // the bag changed while this screen is open

  // Wait for the answer instead of saying "no saved items" to someone who has some
  if (!loaded) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!isLoggedIn()) {
    return (
      <View style={styles.center}>
        <Heart size={48} color={colors.textTertiary} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>
          {total > 0 ? `${total} on your wishlist on this phone` : 'Sign in to see your wishlist'}
        </Text>
        {total > 0 && <Text style={styles.emptySubtext}>Sign in to keep {total === 1 ? 'it' : 'them'} in your account.</Text>}
        <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Account')}>
          <Text style={styles.ctaBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleAddToCart = async (variantId: string) => {
    setAddingId(variantId);
    try {
      await addToCart(variantId, 1);
      setInBag((prev) => new Set(prev).add(variantId)); // the bag change event re-reads it too
    } catch (err: any) {
      // used to fail without a word
      const reference = referenceOf(err);
      showAlert('Could not add to bag', `${err?.message || 'Please try again.'}${reference ? `\n\nReference: ${reference}` : ''}`);
    }
    setAddingId(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <Text style={styles.headerSub}>{total} {total === 1 ? 'item' : 'items'}</Text>
        </View>
      </View>

      {total === 0 ? (
        <View style={styles.center}>
          <Heart size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtext}>Tap the heart on any saree to save it here</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.ctaBtnText}>Browse Sarees</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map((item) => {
            const v = item.variant;
            const p = v.product;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.row}
                // a product that is no longer sold has no page to open
                activeOpacity={v.isListed ? 0.8 : 1}
                onPress={() => v.isListed && navigation.navigate('Shop', { screen: 'ProductDetail', params: { slug: p.slug } })}
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
                  {!v.isAvailable && (
                    <Text style={styles.outOfStock}>{v.isListed ? 'Out of Stock' : 'No longer available'}</Text>
                  )}
                  <View style={styles.rowActions}>
                    {v.isAvailable && (
                      inBag.has(v.id) ? (
                        <TouchableOpacity
                          style={[styles.addBtn, styles.goToBagBtn]}
                          onPress={() => navigation.navigate('Cart')}
                        >
                          <ShoppingBag size={14} color="#fff" strokeWidth={2} />
                          <Text style={styles.addBtnText}>Go to Bag</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addBtn, addingId === v.id && { opacity: 0.6 }]}
                          onPress={() => handleAddToCart(v.id)}
                          disabled={addingId === v.id}
                        >
                          <ShoppingBag size={14} color="#fff" strokeWidth={2} />
                          <Text style={styles.addBtnText}>{addingId === v.id ? 'Adding...' : 'Add to Bag'}</Text>
                        </TouchableOpacity>
                      )
                    )}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => toggleVariant(v.id, p.id)}
                      accessibilityLabel={`Remove ${p.title} from wishlist`}
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
      backgroundColor: colors.surfaceMuted,
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
      backgroundColor: colors.surfaceMuted,
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
    goToBagBtn: { backgroundColor: colors.accent },
    addBtnText: { fontFamily: 'DMSans-Medium', fontSize: 12, color: '#fff' },
    removeBtn: {
      width: 32, height: 32, borderRadius: borderRadius.sm,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
  });
}
