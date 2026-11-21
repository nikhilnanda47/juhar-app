import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl, ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, type ColorPalette } from '../theme';
import { spacing, borderRadius, elevation } from '../theme';
import { getProducts, getCategories, formatPaise, type Product } from '../services/api';
import { FadeInUp, ScalePress } from '../components/AnimatedUI';
import RefreshButton from '../components/RefreshButton';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.margin * 2 - spacing.gutter) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [productsData, catsData] = await Promise.all([
        getProducts({ limit: '8', sortBy: 'newest' }),
        getCategories(),
      ]);
      setNewArrivals(productsData.items || []);
      setCategories((catsData || []).filter((c: any) => c.active !== false).slice(0, 4));
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Brand Sub-header */}
      <FadeInUp delay={0} duration={600}>
        <View style={styles.subHeader}>
          <View style={styles.brandRow}>
            <Text style={styles.brandName}>Juhar</Text>
            <Text style={styles.odiaScript}>ଜୁହାର୍</Text>
          </View>
          <View style={styles.subHeaderRight}>
            <Text style={styles.originLabel}>WESTERN ODISHA</Text>
            <RefreshButton onRefresh={onRefresh} />
          </View>
        </View>
      </FadeInUp>

      {/* Hero Banner — 16:9 */}
      <FadeInUp delay={150} duration={700}>
        <ScalePress onPress={() => navigation.navigate('Shop')} scale={0.98}>
          <View style={styles.heroWrap}>
            <View style={styles.hero}>
              <View style={styles.heroPlaceholder} />
              {/* Gradient overlay with text */}
              <View style={styles.heroOverlay}>
                <Text style={styles.heroLabel}>HANDWOVEN ARCHIVE</Text>
                <Text style={styles.heroTitle}>Sambalpuri Baandha Silk</Text>
              </View>
            </View>
          </View>
        </ScalePress>
      </FadeInUp>

      {/* Collections */}
      <FadeInUp delay={300} duration={600}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Collections</Text>
          <Text style={styles.sectionCount}>{categories.length} WEAVES</Text>
        </View>
        <View style={styles.collectionsGrid}>
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.collectionCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Shop', {
                screen: 'ExploreList',
                params: { categorySlug: cat.slug },
              })}
            >
              <View style={styles.collectionImage} />
              <View style={styles.collectionGradient}>
                <Text style={styles.collectionName}>{cat.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </FadeInUp>

      {/* New Arrivals */}
      <FadeInUp delay={450} duration={600}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Arrivals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Shop')}>
            <Text style={styles.seeAll}>See all →</Text>
          </TouchableOpacity>
        </View>
        {newArrivals.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.arrivalsScroll}
          >
            {newArrivals.map((product: any) => {
              const price = product.startingPricePaise ?? 0;
              const compare = product.compareAtPaise ?? null;
              const lowStock = product.totalStock !== undefined && product.totalStock > 0 && product.totalStock <= 3;
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.arrivalCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Shop', {
                    screen: 'ProductDetail',
                    params: { slug: product.slug },
                  })}
                >
                  <View style={styles.arrivalImage} />
                  <View style={styles.arrivalMeta}>
                    <Text style={styles.arrivalTitle} numberOfLines={1}>{product.title}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.arrivalPrice}>{formatPaise(price)}</Text>
                      {compare && compare > price && (
                        <Text style={styles.arrivalCompare}>{formatPaise(compare)}</Text>
                      )}
                    </View>
                    {lowStock && (
                      <Text style={styles.arrivalLowStock}>
                        {product.totalStock === 1 ? '1 piece left' : `Only ${product.totalStock} woven`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.shimmerRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.shimmerCard} />
            ))}
          </View>
        )}
      </View>
      </FadeInUp>

      <View style={{ height: spacing.lg }} />
    </ScrollView>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 100,
  },

  // ── Sub-header ──
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.margin,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  brandName: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 22,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  odiaScript: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
  subHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  originLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  // ── Hero ──
  heroWrap: {
    paddingHorizontal: spacing.margin,
    marginTop: spacing.sm,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
    position: 'relative',
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.placeholder,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: spacing.md,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to top, rgba(26,28,27,0.7), rgba(26,28,27,0.15), transparent)',
  },
  heroLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.white,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 20,
    color: colors.white,
    lineHeight: 26,
  },

  // ── Sections ──
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.margin,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: 'NotoSerif-Regular',
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.textTertiary,
    letterSpacing: 2,
  },
  seeAll: {
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.primary,
  },

  // ── Collections Grid ──
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
  },
  collectionCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  collectionImage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.placeholder,
  },
  collectionGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 32,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(26,28,27,0.5)',
  },
  collectionName: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 16,
    color: colors.white,
    letterSpacing: -0.2,
  },

  // ── New Arrivals ──
  arrivalsScroll: {
    gap: spacing.gutter,
  },
  arrivalCard: {
    width: 160,
    flexDirection: 'column',
  },
  arrivalImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.placeholder,
    marginBottom: spacing.xs,
  },
  arrivalMeta: {
    paddingTop: 2,
  },
  arrivalTitle: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  arrivalPrice: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  arrivalCompare: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  arrivalLowStock: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    color: colors.accent,
    marginTop: 4,
    letterSpacing: -0.1,
  },

  // ── Shimmer Placeholder ──
  shimmerRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
  },
  shimmerCard: {
    width: 160,
    height: 260,
    backgroundColor: colors.placeholder,
    borderRadius: borderRadius.md,
  },
});
