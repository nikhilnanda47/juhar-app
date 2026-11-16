import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import {
  User, MapPin, Heart, Package, HelpCircle, MessageCircle,
  LogOut, ChevronRight, FileText, Settings,
} from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import {
  isLoggedIn, loadToken, requestOtp, verifyOtp, clearTokens,
  getProfile, updateProfile, type UserProfile,
} from '../services/api';
import { useNavigation } from '@react-navigation/native';

type Screen = 'loading' | 'login' | 'otp' | 'profile' | 'editName';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [screen, setScreen] = useState<Screen>('loading');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const hasToken = await loadToken();
    if (hasToken) {
      try {
        const p = await getProfile();
        setProfile(p);
        setScreen('profile');
      } catch {
        await clearTokens();
        setScreen('login');
      }
    } else {
      setScreen('login');
    }
  };

  const handleRequestOtp = async () => {
    const fullPhone = '+91' + phone;
    setBusy(true);
    setError('');
    try {
      await requestOtp(fullPhone);
      setScreen('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullPhone = '+91' + phone;
    setBusy(true);
    setError('');
    try {
      const result = await verifyOtp(fullPhone, otp);
      const p = await getProfile();
      setProfile(p);
      if (result.isNewUser || !p.name) {
        setEditName('');
        setScreen('editName');
      } else {
        setScreen('profile');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const p = await updateProfile({ name: editName.trim() });
      setProfile(p);
      setScreen('profile');
    } catch (err: any) {
      setError(err.message || 'Failed to save name');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await clearTokens();
          setProfile(null);
          setPhone('');
          setOtp('');
          setScreen('login');
        },
      },
    ]);
  };

  if (screen === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  // ── Not Logged In ──
  if (screen === 'login') {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authPageTitle}>Account</Text>
        <View style={styles.authContent}>
          <User size={48} color={colors.textTertiary} strokeWidth={1.5} />
          <Text style={styles.authTitle}>Log in to your account</Text>
          <Text style={styles.authSubtext}>Enter your phone number to continue.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            <View style={styles.phoneRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                placeholder="98765 43210"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || phone.length < 10) && styles.disabledBtn]}
            onPress={handleRequestOtp}
            disabled={busy || phone.length < 10}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── OTP Verify ──
  if (screen === 'otp') {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authPageTitle}>Account</Text>
        <View style={styles.authContent}>
          <Text style={styles.authTitle}>Verify your number</Text>
          <Text style={styles.authSubtext}>
            OTP sent to{' '}
            <Text style={{ color: colors.textPrimary, fontFamily: 'DMSans-Bold' }}>+91 {phone}</Text>
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>OTP CODE</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={setOtp}
              placeholder="123456"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || otp.length < 6) && styles.disabledBtn]}
            onPress={handleVerifyOtp}
            disabled={busy || otp.length < 6}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Verifying...' : 'Verify'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setOtp(''); setError(''); setScreen('login'); }}>
            <Text style={styles.ghostLink}>Change number</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Name Capture ──
  if (screen === 'editName') {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authContent}>
          <Text style={styles.authTitle}>Welcome to Sajani</Text>
          <Text style={styles.authSubtext}>What should we call you?</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Priya"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || editName.trim().length < 2) && styles.disabledBtn]}
            onPress={handleSaveName}
            disabled={busy || editName.trim().length < 2}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('profile')}>
            <Text style={styles.ghostLink}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Profile (Logged In) — Option C Layout matching mockup ──
  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '';

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileLeft}>
          <View style={styles.avatar}>
            {initials ? (
              <Text style={styles.avatarText}>{initials}</Text>
            ) : (
              <User size={28} color={colors.white} strokeWidth={2} />
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{profile?.name || 'Sajani Customer'}</Text>
            <Text style={styles.profilePhone}>{profile?.phone}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => { setEditName(profile?.name || ''); setScreen('editName'); }}
        >
          <Settings size={18} color={colors.textSecondary} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      {/* Quick Action Tiles — 3 column grid */}
      <View style={styles.tilesRow}>
        <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('Orders')} activeOpacity={0.7}>
          <View style={styles.tileIconWrap}>
            <Package size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Orders</Text>
          <Text style={styles.tileSub}>3 placed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} activeOpacity={0.7}>
          <View style={styles.tileIconWrap}>
            <Heart size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Saved</Text>
          <Text style={styles.tileSub}>4 items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} activeOpacity={0.7}>
          <View style={styles.tileIconWrap}>
            <MapPin size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Addresses</Text>
          <Text style={styles.tileSub}>2 saved</Text>
        </TouchableOpacity>
      </View>

      {/* Menu List Card */}
      <View style={styles.menuCard}>
        {/* Edit Profile */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setEditName(profile?.name || ''); setScreen('editName'); }}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <User size={20} color="#877274" strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Edit Profile</Text>
          </View>
          <ChevronRight size={18} color="rgba(135,114,116,0.6)" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* FAQs */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <HelpCircle size={20} color="#877274" strokeWidth={1.5} />
            <Text style={styles.menuLabel}>FAQs</Text>
          </View>
          <ChevronRight size={18} color="rgba(135,114,116,0.6)" strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Help & Support */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <MessageCircle size={20} color="#877274" strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Help & Support</Text>
          </View>
          <View style={styles.menuRight}>
            <View style={styles.whatsappBadge}>
              <Text style={styles.whatsappText}>WhatsApp 24/7</Text>
            </View>
            <ChevronRight size={18} color="rgba(135,114,116,0.6)" strokeWidth={2} />
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Terms & Privacy */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <FileText size={20} color="#877274" strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Terms & Privacy</Text>
          </View>
          <ChevronRight size={18} color="rgba(135,114,116,0.6)" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Log Out Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <LogOut size={20} color="#C44A4A" strokeWidth={1.5} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <View style={styles.versionWrap}>
        <Text style={styles.versionText}>Sajani v2.0.4</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // ── Auth screens ──
  authContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.margin },
  authPageTitle: { fontFamily: 'NotoSerif-Medium', fontSize: 20, color: colors.textPrimary, paddingTop: 56, lineHeight: 26 },
  authContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  authTitle: { fontFamily: 'NotoSerif-Regular', fontSize: 24, color: colors.textPrimary, marginTop: spacing.md },
  authSubtext: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },

  // Input
  inputGroup: { width: '100%', marginBottom: spacing.md },
  inputLabel: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
  input: {
    width: '100%', height: 48, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  phoneRow: { flexDirection: 'row' },
  phonePrefix: {
    height: 48, paddingHorizontal: 14, backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md,
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  phonePrefixText: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textSecondary },
  phoneInput: {
    flex: 1, height: 48, backgroundColor: colors.surface,
    borderTopRightRadius: borderRadius.md, borderBottomRightRadius: borderRadius.md,
    paddingHorizontal: 14, fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary, letterSpacing: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'DMSans-SemiBold' },

  // Buttons
  primaryBtn: {
    width: '100%', backgroundColor: colors.primary, borderRadius: borderRadius.md, height: 48,
    justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  disabledBtn: { opacity: 0.4 },
  primaryBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  ghostLink: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.primary, marginTop: spacing.md },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.error, marginBottom: spacing.sm },

  // ── Profile (logged in) ──
  scrollContainer: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.margin, paddingBottom: 100 },

  // Profile Card
  profileCard: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#8B3A4A',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: 'DMSans-Medium', fontSize: 18, color: colors.white, letterSpacing: 0.5 },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: 'DMSans-Medium', fontSize: 18, color: colors.textPrimary, lineHeight: 22 },
  profilePhone: { fontFamily: 'DMSans-Regular', fontSize: 14, color: '#877274', lineHeight: 22, marginTop: 1 },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Action Tiles
  tilesRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.gutter },
  tile: {
    flex: 1, padding: spacing.md, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  tileIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  tileLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.26 },
  tileSub: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#877274', letterSpacing: 0.66, marginTop: 2 },

  // Menu Card
  menuCard: {
    marginTop: spacing.lg, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  menuItem: {
    height: 52, paddingHorizontal: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  menuLabel: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuDivider: { height: 1, backgroundColor: '#E8E8E5', marginHorizontal: spacing.md },

  // WhatsApp badge
  whatsappBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full,
    backgroundColor: '#E8F5E9',
  },
  whatsappText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: '#2E7D32', letterSpacing: -0.1 },

  // Log Out
  logoutBtn: {
    marginTop: spacing.lg, height: 52, borderRadius: 12,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEEEEE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  logoutText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: '#C44A4A', letterSpacing: -0.16 },

  // Version
  versionWrap: { marginTop: spacing.xl, alignItems: 'center' },
  versionText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: '#999999' },
});
