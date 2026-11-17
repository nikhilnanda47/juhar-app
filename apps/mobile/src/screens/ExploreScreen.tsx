import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, RefreshControl, TextInput,
} from 'react-native';
import { Search as SearchIcon, SlidersHorizontal, Heart, ChevronDown } from 'lucide-react-native';
import { colors, spacing, borderRadius, elevation } from '../theme';
import {
  getCategories, getProducts, formatPaise,
  type Category, type Product,
} from '../services/api';
import { FadeInUp, ScalePress } from '../components/AnimatedUI';
import RefreshButton from '../components/RefreshButton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.margin * 2 - spacing.gutter) / 2;

interface Props {
  navigation: any;
  route?: any;
}

export default function ExploreScreen({ navigation, route }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async (categoryId?: string | null) => {
    try {
      setError('');
      const [cats, prods] = await Promise.all([
        getCategories(),
        getProducts(categoryId ? { categoryId } : undefined),
      ]);
      setCategories(cats.filter((c: any) => c.active !== false));
      setProducts(prods.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const selectCategory = (catId: string | null) => {
    setSelectedCategory(catId);
    setLoading(true);
    loadData(catId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedCategory);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Title Row */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Shop</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.originLabel}>HANDCRAFTED IN ODISHA</Text>
          <RefreshButton onRefresh={onRefresh} />
        </View>
      </View>
      <Text style={styles.subtitle}>Quiet luxury woven on authentic family pit-looms.</Text>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <SearchIcon size={20} color={colors.textTertiary} strokeWidth={1.5} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search handwoven sarees, weaves..."
          placeholderTextColor={colors.textTertiary}
          editable={false}
        />
        <TouchableOpacity>
          <SlidersHorizontal size={18} color={colors.textTertiary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        <TouchableOpacity
          style={[styles.chip, !selectedCategory && styles.chipActive]}
          onPress={() => selectCategory(null)}
        >
          <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
            onPress={() => selectCategory(cat.id)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count & Sort Bar */}
      <View style={styles.countSortRow}>
        <View style={styles.countRow}>
          <View style={styles.countDot} />
          <Text style={styles.countText}>{products.length} sarees</Text>
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <Text style={styles.sortBtnText}>Featured</Text>
          <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Product Grid */}
      <View style={styles.grid}>
        {products.map((product: any, idx: number) => (
          <FadeInUp key={product.id} delay={idx * 80} duration={400} distance={12}>
            <ProductCard
              product={product}
              onPress={() => navigation.navigate('ProductDetail', { slug: product.slug })}
            />
          </FadeInUp>
        ))}
      </View>

      {products.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <SearchIcon size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No sarees found</Text>
          <Text style={styles.emptySubtext}>Try a different category</Text>
        </View>
      )}

      <View style={{ height: spacing.lg }} />
    </ScrollView>
  );
}

function ProductCard({ product, onPress }: { product: any; onPress: () => void }) {
  const price = product.startingPricePaise ?? 0;
  const compare = product.compareAtPaise ?? null;
  const lowStock = product.totalStock !== undefined && product.totalStock > 0 && product.totalStock <= 3;
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        <View style={styles.cardImage} />

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={(e) => { e.stopPropagation?.(); setWishlisted(!wishlisted); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Heart
            size={16}
            color={wishlisted ? colors.primary : colors.textTertiary}
            fill={wishlisted ? colors.primary : 'none'}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Origin Badge */}
        {product.origin && (
          <View style={styles.originBadge}>
            <Text style={styles.originBadgeText}>{product.origin.split(',')[0]}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardMeta}>
        <Text style={styles.cardTitle} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {product.fabric || product.weaveMethod || 'Handloom'}
        </Text>

        <View style={styles.cardPriceSection}>
          <View style={styles.cardPriceRow}>
            <Text style={styles.cardPrice}>{formatPaise(price)}</Text>
            {compare && compare > price && (
              <Text style={styles.cardCompare}>{formatPaise(compare)}</Text>
            )}
          </View>
          {lowStock ? (
            <View style={styles.stockRow}>
              <View style={styles.stockDot} />
              <Text style={styles.stockTextError}>Only {product.totalStock} left</Text>
            </View>
          ) : (
            <Text style={styles.stockTextSecondary}>Ready to ship</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // Title
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: spacing.margin, paddingTop: 56,
  },
  pageTitle: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  originLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: spacing.margin,
    marginTop: 2,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.margin,
    marginTop: spacing.sm,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },

  // Chips
  chipScroll: { marginTop: 10 },
  chipContent: { paddingHorizontal: spacing.margin, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: '#E8E8E5',
  },
  chipActive: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    letterSpacing: 0.3,
    color: '#544244',
  },
  chipTextActive: {
    color: colors.white,
  },

  // Count & Sort
  countSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.margin,
    marginTop: 10,
    marginBottom: 12,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  countText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sortBtnText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.margin,
    gap: spacing.gutter,
  },

  // Product Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EEEEE9',
    position: 'relative',
    marginBottom: 10,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E0DDD8',
  },

  // Wishlist
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Origin Badge
  originBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originBadgeText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Card Meta
  cardMeta: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Price Section
  cardPriceSection: {
    marginTop: 10,
    paddingTop: 8,
    gap: 4,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  cardPrice: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  cardCompare: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },

  // Stock
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
  stockTextError: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.error,
    letterSpacing: 0.3,
  },
  stockTextSecondary: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.3,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtext: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
