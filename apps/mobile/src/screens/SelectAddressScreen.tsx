import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Plus, Phone, Pencil, ShieldCheck, ArrowRight, Leaf } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import { getAddresses, type Address } from '../services/api';

interface Props { navigation: any; route: any; }

export default function SelectAddressScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadAddresses(); }, []));

  const loadAddresses = async () => {
    try {
      const data = await getAddresses();
      setAddresses(data);
      const def = data.find((a) => a.isDefault) || data[0];
      if (def) setSelected(def.id);
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const selectedAddr = addresses.find((a) => a.id === selected);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <Text style={styles.sectionSub}>Select where your parcel should be delivered</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{addresses.length} PLACES</Text>
          </View>
        </View>

        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <MapPin size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtext}>Add a delivery address to continue</Text>
          </View>
        ) : (
          addresses.map((addr) => {
            const isSelected = selected === addr.id;
            return (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addrCard, isSelected && styles.addrCardSelected]}
                onPress={() => setSelected(addr.id)}
                activeOpacity={0.85}
              >
                <View style={styles.addrRow}>
                  <View style={[styles.radio, isSelected && styles.radioActive]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.labelRow}>
                      <Text style={styles.addrLabel}>{addr.label || 'Address'}</Text>
                      {addr.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addrName}>{addr.recipientName}</Text>
                    <Text style={styles.addrLine}>
                      {[addr.line1, addr.line2, addr.landmark].filter(Boolean).join(', ')}
                    </Text>
                    <Text style={styles.addrLine}>
                      {addr.city}, {addr.state}, {addr.pinCode}
                    </Text>
                    <View style={styles.phoneRow}>
                      <Phone size={14} color={colors.textTertiary} strokeWidth={1.5} />
                      <Text style={styles.phoneText}>{addr.recipientPhone}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.push('AddAddress', { address: addr })}
                    accessibilityLabel={`Edit address for ${addr.recipientName}`}
                  >
                    <Pencil size={16} color={colors.textTertiary} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>

                <View style={styles.deliveryStrip}>
                  <View style={styles.deliveryStripLeft}>
                    <Leaf size={14} color={colors.accent} strokeWidth={2} />
                    <Text style={styles.deliveryStripText}>Cotton muslin wrapped dispatch</Text>
                  </View>
                  <Text style={styles.deliveryEst}>Est. 5-7 Days</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.push('AddAddress')}
        >
          <Plus size={20} color={colors.primary} strokeWidth={2} />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>

        <View style={styles.assuranceNote}>
          <ShieldCheck size={20} color={colors.accent} strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.assuranceTitle}>Handcrafted Saree Packaging</Text>
            <Text style={styles.assuranceSub}>
              Each Sambalpuri weave arrives inside a signature unbleached kora cloth cover with its certified weaver provenance card.
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {selected && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyInfo}>
            <Text style={styles.stickyLabel}>
              Deliver to: <Text style={styles.stickyValue}>{selectedAddr?.label || 'Address'} ({selectedAddr?.pinCode})</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deliverBtn}
            onPress={() => navigation.navigate('OrderReview', { addressId: selected })}
          >
            <Text style={styles.deliverBtnText}>Deliver Here</Text>
            <ArrowRight size={18} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.margin, paddingBottom: 140 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary, marginTop: spacing.md },
  emptySubtext: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  countBadge: {
    backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  countText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },

  addrCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  addrCardSelected: {},
  addrRow: { flexDirection: 'row', gap: 12 },

  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: colors.borderMedium, justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  addrLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  defaultBadge: {
    backgroundColor: colors.statusDeliveredBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  defaultText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.statusDeliveredText, letterSpacing: 0.8, textTransform: 'uppercase' },

  addrName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  addrLine: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  phoneText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },

  editBtn: { padding: 4 },

  deliveryStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 10, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.surfaceAlt, borderRadius: 8,
  },
  deliveryStripLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryStripText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 0.3 },
  deliveryEst: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.primary },

  addBtn: {
    width: '100%', height: 48, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 8,
    marginBottom: spacing.md,
  },
  addBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.primary, letterSpacing: -0.2 },

  assuranceNote: {
    flexDirection: 'row', gap: 12, padding: spacing.md,
    backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.md,
  },
  assuranceTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.2 },
  assuranceSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.stickyBar,
    paddingHorizontal: spacing.margin, paddingTop: 10, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 5,
  },
  stickyInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, paddingHorizontal: 4,
  },
  stickyLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  stickyValue: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textPrimary },
  deliverBtn: {
    width: '100%', height: 48, borderRadius: 8,
    backgroundColor: colors.primary, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  deliverBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
});
