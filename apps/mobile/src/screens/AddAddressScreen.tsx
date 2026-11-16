import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Truck, Check } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { createAddress } from '../services/api';

interface Props { navigation: any; }

export default function AddAddressScreen({ navigation }: Props) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Odisha');
  const [pinCode, setPinCode] = useState('');
  const [label, setLabel] = useState('Home');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!recipientName || !recipientPhone || !line1 || !city || !district || !pinCode) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await createAddress({
        recipientName, recipientPhone: '+91' + recipientPhone, line1,
        line2: line2 || undefined, landmark: landmark || undefined,
        city, district, state, pinCode, label, isDefault,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const isValid = recipientName.length >= 2 && recipientPhone.length === 10 &&
    line1.length >= 5 && city.length >= 2 && district.length >= 2 && /^[1-9][0-9]{5}$/.test(pinCode);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Reassurance Banner */}
        <View style={styles.banner}>
          <Truck size={18} color={colors.accent} strokeWidth={2} />
          <Text style={styles.bannerText}>Handcrafted weaves are shipped with insured, climate-safe packaging.</Text>
        </View>

        {/* Full Name */}
        <Field label="FULL NAME" value={recipientName} onChangeText={setRecipientName} placeholder="e.g. Priya Mohanty" />

        {/* Phone */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <View style={styles.inputBox}>
            <Text style={styles.phonePrefix}>+91</Text>
            <View style={styles.phoneDivider} />
            <TextInput
              style={styles.phoneInput}
              value={recipientPhone}
              onChangeText={(t) => setRecipientPhone(t.replace(/[^0-9]/g, ''))}
              placeholder="98765 43210"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        {/* Address Line 1 */}
        <Field label="ADDRESS LINE 1 (HOUSE NO., BUILDING, STREET)" value={line1} onChangeText={setLine1} placeholder="House / Flat No., Street name" />

        {/* Address Line 2 */}
        <Field label="ADDRESS LINE 2 (APARTMENT, SUITE, AREA)" value={line2} onChangeText={setLine2} placeholder="Near Shanti Temple" optional />

        {/* Landmark */}
        <Field label="LANDMARK" value={landmark} onChangeText={setLandmark} placeholder="Opposite Government Girls High School" optional />

        {/* City & District */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="CITY" value={city} onChangeText={setCity} placeholder="Sambalpur" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="DISTRICT" value={district} onChangeText={setDistrict} placeholder="Sambalpur" />
          </View>
        </View>

        {/* State & PIN */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="STATE" value={state} onChangeText={setState} placeholder="Odisha" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="PIN CODE" value={pinCode} onChangeText={(t: string) => setPinCode(t.replace(/[^0-9]/g, ''))} placeholder="768001" keyboardType="number-pad" maxLength={6} />
          </View>
        </View>

        {/* Address Type Chips */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>SAVE ADDRESS AS</Text>
          <View style={styles.chipRow}>
            {['Home', 'Office', 'Other'].map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, label === l && styles.chipActive]}
                onPress={() => setLabel(l)}
              >
                <Text style={[styles.chipText, label === l && styles.chipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Default Checkbox */}
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setIsDefault(!isDefault)}>
          <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
            {isDefault && <Check size={14} color={colors.white} strokeWidth={3} />}
          </View>
          <Text style={styles.checkboxLabel}>Set as default delivery address</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (!isValid || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isValid || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Address'}</Text>
          <Check size={18} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, maxLength, optional }: any) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional && <Text style={styles.optionalText}>Optional</Text>}
      </View>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.margin, paddingBottom: 100 },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.md, marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bannerText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, flex: 1 },

  // Field
  fieldWrap: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  optionalText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textTertiary, letterSpacing: 1, opacity: 0.7 },
  inputBox: {
    height: 48, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  input: {
    flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary,
  },

  // Phone
  phonePrefix: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textSecondary, marginRight: 8 },
  phoneDivider: { width: 1, height: 16, backgroundColor: '#E2E3E0', marginRight: 10 },
  phoneInput: {
    flex: 1, fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary, letterSpacing: 0.5,
  },

  row: { flexDirection: 'row', gap: spacing.gutter },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: {
    height: 36, paddingHorizontal: 20, borderRadius: borderRadius.full,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textSecondary, letterSpacing: 0.3 },
  chipTextActive: { color: colors.white, fontFamily: 'DMSans-SemiBold' },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  checkboxActive: { backgroundColor: colors.primary },
  checkboxLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary },

  // Sticky
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.margin, paddingVertical: 12, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 5,
  },
  saveBtn: {
    width: '100%', height: 48, borderRadius: borderRadius.md,
    backgroundColor: colors.primary, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.white, letterSpacing: -0.2 },
});
