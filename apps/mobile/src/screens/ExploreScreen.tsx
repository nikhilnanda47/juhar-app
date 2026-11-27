import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { Search as SearchIcon, SlidersHorizontal, Heart, ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import { useTopPadding } from '../utils/safeArea';
import {
  getCategories, getProducts, getProductFilters, formatPaise,
  type Category, type Product, type ProductFilterOptions, messageOf} from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useWishlist } from '../contexts/WishlistContext';
import { appendUnique } from '../services/paging';
import {
  NO_FILTERS, SORT_OPTIONS, activeFilterCount, effectiveSearch, filterChips, priceRangeError,
  removeFilter, shopQuery, sortLabel, type ShopFilters, type ShopSort,
} from '../services/shopList';
import { FadeInUp } from '../components/AnimatedUI';
import RefreshButton from '../components/RefreshButton';
import LoadFailed from '../components/LoadFailed';
import ProductImage from '../components/ProductImage';
import { describeLoadFailure, type LoadFailure } from '../services/loadFailure';
import type { ScreenNavigation } from '../navigation/types';


interface Props {
  navigation: ScreenNavigation;
}

export default function ExploreScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const topPad = useTopPadding(56);
  // two cards per row, sized from the grid's real width once it is on screen (see HomeScreen's collection tiles)
  const [gridWidth, setGridWidth] = useState(0);
  const cardWidth = gridWidth > 0 ? Math.floor((gridWidth - spacing.margin * 2 - spacing.gutter) / 2) : 0;
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const { refreshWishlist } = useWishlist();
  // the hearts are read again whenever the Shop comes back into view (something may have changed elsewhere)
  useFocusEffect(useCallback(() => { refreshWishlist(); }, [refreshWishlist]));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<ShopSort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<ShopFilters>(NO_FILTERS); // the filters in use
  const [draft, setDraft] = useState<ShopFilters>(NO_FILTERS); // what is being chosen in the sheet
  const [filterOptions, setFilterOptions] = useState<ProductFilterOptions | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0); // every saree that matches, not just the ones loaded
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true); // first load of the screen
  const [listLoading, setListLoading] = useState(false); // a new category, sort, search or filter is loading
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [failure, setFailure] = useState<LoadFailure | null>(null); // the same failure, for the offline screen
  // Only the newest request may change the list (a slow answer for an old choice is dropped)
  const requestId = useRef(0);

  // Wait for a pause in typing before asking the API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const searchTerm = effectiveSearch(debouncedSearch); // a single letter is not searched

  // The first page of the list for the current category, sort, search and filters
  const loadFirstPage = useCallback(async () => {
    const mine = ++requestId.current;
    setLoadError('');
    try {
      const page = await getProducts(shopQuery({ categoryId: selectedCategory, search: searchTerm, sort, filters }));
      if (mine !== requestId.current) return;
      setProducts(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setTotal(page.total);
      setError(''); setFailure(null);
    } catch (err) {
      if (mine === requestId.current) { setError(messageOf(err, 'Failed to load catalog')); setFailure(describeLoadFailure(err)); }
    } finally {
      if (mine === requestId.current) {
        setLoading(false);
        setListLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedCategory, searchTerm, sort, filters]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.filter((c) => c.active !== false));
    } catch {
      // the list below still works without the chips
    }
  }, []);

  useEffect(() => {
    loadCategories();
    getProductFilters().then(setFilterOptions).catch(() => {});
  }, [loadCategories]);

  // Runs on the first load and again whenever the category, sort, search or filters change
  const firstLoad = useRef(true);
  useEffect(() => {
    if (!firstLoad.current) setListLoading(true);
    firstLoad.current = false;
    loadFirstPage();
  }, [loadFirstPage]);

  const selectCategory = (catId: string | null) => setSelectedCategory(catId);

  const chooseSort = (next: ShopSort) => {
    setSortOpen(false);
    setSort(next);
  };

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const applyFilters = () => {
    if (priceRangeError(draft)) return;
    setFilters(draft);
    setSheetOpen(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
    loadFirstPage();
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    const mine = requestId.current;
    setLoadingMore(true);
    setLoadError('');
    try {
      const page = await getProducts(shopQuery({ categoryId: selectedCategory, search: searchTerm, sort, filters, cursor }));
      if (mine !== requestId.current) return; // the category, sort, search or filters changed meanwhile
      setProducts((shown) => appendUnique(shown, page.items));
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setTotal(page.total);
    } catch {
      setLoadError('Could not load more sarees. Tap to try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const chips = filterChips(filters);
  const draftError = priceRangeError(draft);

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
      <View style={[styles.titleRow, { paddingTop: topPad }]}>
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
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search sarees"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search">
            <X size={18} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={openSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Filters">
          <SlidersHorizontal size={18} color={chips.length > 0 ? colors.primary : colors.textTertiary} strokeWidth={1.5} />
          {chips.length > 0 && (
            <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount(filters)}</Text></View>
          )}
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

      {/* Filters that are on */}
      {chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContent}>
          {chips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeFilterChip}
              onPress={() => setFilters(removeFilter(filters, chip.key))}
              accessibilityLabel={`Remove filter ${chip.label}`}
            >
              <Text style={styles.activeFilterText}>{chip.label}</Text>
              <X size={14} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Count & Sort Bar */}
      <View style={styles.countSortRow}>
        <View style={styles.countRow}>
          <View style={styles.countDot} />
          <Text style={styles.countText}>{total} {total === 1 ? 'saree' : 'sarees'}</Text>
        </View>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen((open) => !open)} activeOpacity={0.8}>
          <Text style={styles.sortBtnText}>{sortLabel(sort)}</Text>
          <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {sortOpen && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((o) => (
            <TouchableOpacity key={o.value} style={styles.sortOption} onPress={() => chooseSort(o.value)} activeOpacity={0.7}>
              <Text style={[styles.sortOptionText, o.value === sort && styles.sortOptionTextActive]}>{o.label}</Text>
              {o.value === sort && <Check size={16} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {listLoading && <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.primary} />}

      {/* Product Grid */}
      <View style={[styles.grid, listLoading && { opacity: 0.4 }]} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
        {cardWidth > 0 && products.map((product, idx) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <FadeInUp delay={idx * 80} duration={400} distance={12}>
              <ProductCard
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { slug: product.slug })}
              />
            </FadeInUp>
          </View>
        ))}
      </View>

      {products.length > 0 && (
        <View style={styles.loadMoreWrap}>
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore} activeOpacity={0.8}>
              {loadingMore
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.loadMoreText}>Load more sarees</Text>}
            </TouchableOpacity>
          )}
          {!!loadError && <Text style={styles.loadErrorText}>{loadError}</Text>}
          <Text style={styles.shownText}>
            {hasMore ? `Showing ${products.length} of ${total} sarees` : `All ${products.length} ${products.length === 1 ? 'saree' : 'sarees'} shown`}
          </Text>
        </View>
      )}

      {products.length === 0 && !loading && !listLoading && failure?.kind === 'offline' && (
        <View style={styles.offlineWrap}>
          <LoadFailed failure={failure} onRetry={loadFirstPage} />
        </View>
      )}

      {products.length === 0 && !loading && !listLoading && failure?.kind !== 'offline' && (
        <View style={styles.emptyState}>
          <SearchIcon size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>
            {error ? 'Could not load sarees' : searchTerm ? `No results for "${searchTerm}"` : 'No sarees found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {error ? error : searchTerm || chips.length > 0 ? 'Try a different search or fewer filters' : 'Try a different category'}
          </Text>
          {!error && (searchTerm || chips.length > 0 || selectedCategory) && (
            <TouchableOpacity
              style={styles.browseAllBtn}
              onPress={() => { setSearch(''); setFilters(NO_FILTERS); setSelectedCategory(null); }}
            >
              <Text style={styles.browseAllText}>Browse all</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: spacing.lg }} />

      {/* Filter sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSheetOpen(false)} accessibilityLabel="Close filters" />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)} accessibilityLabel="Close filters">
                <X size={22} color={colors.textPrimary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
              {([
                ['fabric', 'Fabric', filterOptions?.fabrics ?? []],
                ['weaveMethod', 'Weave', filterOptions?.weaveMethods ?? []],
                ['color', 'Colour', filterOptions?.colors ?? []],
              ] as const).map(([key, label, options]) => (
                options.length > 0 && (
                  <View key={key} style={styles.sheetGroup}>
                    <Text style={styles.sheetGroupLabel}>{label}</Text>
                    <View style={styles.optionWrap}>
                      {options.map((o) => {
                        const on = draft[key] === o;
                        return (
                          <TouchableOpacity
                            key={o}
                            style={[styles.optionChip, on && styles.optionChipOn]}
                            onPress={() => setDraft({ ...draft, [key]: on ? null : o })}
                            accessibilityLabel={`${label} ${o}`}
                          >
                            <Text style={[styles.optionChipText, on && styles.optionChipTextOn]}>{o}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              ))}
              <View style={styles.sheetGroup}>
                <Text style={styles.sheetGroupLabel}>Price (₹)</Text>
                <View style={styles.priceRow}>
                  {([['minRupees', 'Lowest'], ['maxRupees', 'Highest']] as const).map(([key, label]) => (
                    <TextInput
                      key={key}
                      style={styles.priceInput}
                      placeholder={label}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="number-pad"
                      value={draft[key]}
                      onChangeText={(text) => setDraft({ ...draft, [key]: text })}
                      accessibilityLabel={`${label} price`}
                    />
                  ))}
                </View>
                {!!draftError && <Text style={styles.priceError}>{draftError}</Text>}
              </View>
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => setDraft(NO_FILTERS)}>
                <Text style={styles.clearBtnText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.applyBtn, !!draftError && { opacity: 0.5 }]} onPress={applyFilters} disabled={!!draftError}>
                <Text style={styles.applyBtnText}>Show sarees</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const price = product.startingPricePaise ?? 0;
  const compare = product.compareAtPaise ?? null;
  const lowStock = product.totalStock !== undefined && product.totalStock > 0 && product.totalStock <= 3;
  // The heart is for the whole saree: filled when any colour of it is saved. (The list sends
  // firstVariantId, the colour the card's price belongs to, and no variants array.)
  const { isProductSaved, toggleProduct } = useWishlist();
  const wishlisted = isProductSaved(product.id);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        <View style={styles.cardImage}>
          <ProductImage uri={product.primaryImage?.url} alt={product.primaryImage?.alt || product.title} />
        </View>

        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistBtn}
          onPress={(e) => { e.stopPropagation?.(); toggleProduct(product.id, product.firstVariantId); }}
          accessibilityLabel={wishlisted ? 'Remove from wishlist' : 'Save this saree'}
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

const createStyles = (colors: ColorPalette) => StyleSheet.create({
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
    backgroundColor: colors.surfaceMuted,
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
    color: colors.textBrand,
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
  sortMenu: {
    marginHorizontal: spacing.margin,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary },
  sortOptionTextActive: { fontFamily: 'DMSans-SemiBold', color: colors.primary },

  // Filters
  filterBadge: {
    position: 'absolute', top: -8, right: -10, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  filterBadgeText: { fontFamily: 'DMSans-Bold', fontSize: 10, color: colors.white },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.primary,
  },
  activeFilterText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.primary },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: spacing.margin, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sheetTitle: { fontFamily: 'NotoSerif-Medium', fontSize: 20, color: colors.textPrimary },
  sheetGroup: { marginTop: spacing.md },
  sheetGroupLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  optionChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionChipText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary },
  optionChipTextOn: { color: colors.white },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceInput: {
    flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: 12, fontFamily: 'DMSans-Regular', fontSize: 15, color: colors.textPrimary,
  },
  priceError: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.error, marginTop: 6 },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  clearBtn: {
    flex: 1, height: 46, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },
  applyBtn: { flex: 2, height: 46, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  browseAllBtn: {
    marginTop: spacing.md, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 6, borderWidth: 1, borderColor: colors.primary,
  },
  browseAllText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },

  // Load more
  loadMoreWrap: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.margin,
    paddingTop: spacing.lg,
  },
  loadMoreBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loadMoreText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },
  offlineWrap: { minHeight: 360 },
  loadErrorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error, textAlign: 'center' },
  shownText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.margin,
    gap: spacing.gutter,
  },

  // Product Card (it fills its grid slot, whose width is set where the grid is drawn)
  card: {
    width: '100%',
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
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
    marginBottom: 10,
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: colors.placeholder,
  },

  // Wishlist
  wishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Origin Badge
  originBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.surfaceOverlay,
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
