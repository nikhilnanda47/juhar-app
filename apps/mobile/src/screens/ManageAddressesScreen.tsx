import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Plus, Phone, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import { getAddresses, updateAddress, deleteAddress, referenceOf, messageOf, type Address } from '../services/api';
import ErrorReference from '../components/ErrorReference';
import type { ScreenNavigation } from '../navigation/types';

const MAX_ADDRESSES = 10; // the same limit the API enforces

interface Props { navigation: ScreenNavigation; }

/** Account > Addresses: see, edit, delete and choose the default of the saved delivery addresses. */
export default function ManageAddressesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState('');

  const reload = useCallback(async () => {
    try {
      setAddresses(await getAddresses());
      setError(''); setErrorRef('');
    } catch (e) {
      setError(messageOf(e, 'Could not load your addresses. Please try again.'));
      setErrorRef(referenceOf(e));
    }
    setLoading(false);
  }, []);

  // read the list every time the screen comes into view (also when back from editing or adding)
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const run = async (id: string, work: () => Promise<unknown>) => {
    if (busyId) return;
    setBusyId(id); setError(''); setErrorRef('');
    try { await work(); await reload(); }
    catch (e) { setError(messageOf(e, 'Something went wrong. Please try again.')); setErrorRef(referenceOf(e)); }
    finally { setBusyId(null); }
  };

  const makeDefault = (a: Address) => run(a.id, () => updateAddress(a.id, { isDefault: true }));

  const remove = (a: Address) => {
    const what = [a.recipientName, a.line1].filter(Boolean).join(', ');
    const doDelete = () => { run(a.id, () => deleteAddress(a.id)); };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete this address?\n\n${what}`)) doDelete();
    } else {
      Alert.alert('Delete this address?', what, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const full = addresses.length >= MAX_ADDRESSES;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <Text style={styles.sectionSub}>Your default address is pre-selected at checkout</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{addresses.length} PLACES</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <ErrorReference id={errorRef} />

        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <MapPin size={48} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtext}>Add one now so checkout is quicker next time</Text>
          </View>
        ) : (
          addresses.map((a) => {
            const busy = busyId === a.id;
            return (
              <View key={a.id} style={[styles.card, busy && styles.cardBusy]}>
                <View style={styles.labelRow}>
                  <Text style={styles.addrLabel}>{a.label || 'Address'}</Text>
                  {a.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addrName}>{a.recipientName}</Text>
                <Text style={styles.addrLine}>{[a.line1, a.line2, a.landmark].filter(Boolean).join(', ')}</Text>
                <Text style={styles.addrLine}>{a.city}, {a.state}, {a.pinCode}</Text>
                <View style={styles.phoneRow}>
                  <Phone size={14} color={colors.textTertiary} strokeWidth={1.5} />
                  <Text style={styles.phoneText}>{a.recipientPhone}</Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    disabled={busy}
                    onPress={() => navigation.push('AddAddress', { address: a })}
                    accessibilityLabel={`Edit address for ${a.recipientName}`}
                  >
                    <Pencil size={14} color={colors.textPrimary} strokeWidth={1.5} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  {!a.isDefault && (
                    <TouchableOpacity style={styles.actionBtn} disabled={busy} onPress={() => makeDefault(a)}>
                      <Text style={styles.actionText}>Make default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    disabled={busy}
                    onPress={() => remove(a)}
                    accessibilityLabel={`Delete address for ${a.recipientName}`}
                  >
                    <Trash2 size={14} color={colors.error} strokeWidth={1.5} />
                    <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <TouchableOpacity
          style={[styles.addBtn, full && styles.addBtnDisabled]}
          disabled={full}
          onPress={() => navigation.push('AddAddress')}
        >
          <Plus size={18} color={colors.primary} strokeWidth={2} />
          <Text style={styles.addBtnText}>
            {full ? `You can keep up to ${MAX_ADDRESSES} addresses. Delete one to add another.` : 'Add New Address'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.margin, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  sectionTitle: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  sectionSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  countBadge: { backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  countText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent, letterSpacing: 1.5 },

  errorText: { fontFamily: 'DMSans-Regular', fontSize: 13, color: colors.error, marginBottom: 4 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary, marginTop: spacing.md },
  emptySubtext: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardBusy: { opacity: 0.6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  addrLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  defaultBadge: { backgroundColor: colors.statusDeliveredBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  defaultText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.statusDeliveredText, letterSpacing: 0.8, textTransform: 'uppercase' },
  addrName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  addrLine: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  phoneText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },

  actions: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: {
    height: 36, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceMuted,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  actionText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary },
  deleteBtn: { marginLeft: 'auto', backgroundColor: 'transparent' },

  addBtn: {
    width: '100%', minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 15, color: colors.primary, letterSpacing: -0.2, flexShrink: 1, textAlign: 'center' },
});
