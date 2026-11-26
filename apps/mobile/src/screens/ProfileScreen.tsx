import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Alert, Platform, RefreshControl, Switch,
} from 'react-native';
import {
  User, MapPin, Heart, Package, HelpCircle, MessageCircle,
  LogOut, ChevronRight, FileText, Settings, Sun, Moon,
} from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, borderRadius } from '../theme';
import {
  loadToken,
  requestOtp,
  verifyOtp,
  clearTokens,
  getProfile,
  updateProfile,
  getAddresses,
  getOrders,
  referenceOf,
  type UserProfile,
} from '../services/api';
import { useWishlist } from '../contexts/WishlistContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ErrorReference from '../components/ErrorReference';
import LoadFailed from '../components/LoadFailed';
import { describeLoadFailure, isNetworkError, type LoadFailure } from '../services/loadFailure';
import { FadeInUp } from '../components/AnimatedUI';
import RefreshButton from '../components/RefreshButton';
import { syncLocalCartToServer } from '../services/localCart';
import { resendAvailableAt, secondsLeft, resendLabel } from '../services/resend';
import { useOnMount } from '../utils/hooks';

type Screen = 'loading' | 'loadFailed' | 'login' | 'otp' | 'profile' | 'editName';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [screen, setScreen] = useState<Screen>('loading');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState(''); // the API's reference for the failed request
  const [failure, setFailure] = useState<LoadFailure | null>(null); // why the account could not be read at start
  const [resendAt, setResendAt] = useState(0);   // when "Resend code" works again (ms)
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [resentNote, setResentNote] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const { total: savedCount, refreshWishlist } = useWishlist();
  // the Saved count is read again whenever this screen comes into view
  useFocusEffect(useCallback(() => { refreshWishlist(); }, [refreshWishlist]));

  // read the saved login once, when the screen first opens
  useOnMount(() => { checkAuth(); });

  // tick once a second while the code screen counts down to "Resend code"
  const resendLeft = secondsLeft(resendAt, now);
  useEffect(() => {
    if (screen !== 'otp' || resendLeft <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [screen, resendLeft]);

  const checkAuth = async () => {
    const hasToken = await loadToken();
    if (hasToken) {
      try {
        const p = await getProfile();
        setProfile(p);
        setFailure(null);
        setScreen('profile');
        // Fetch counts
        fetchCounts();
      } catch (err) {
        // No signal is not a logout: keep the login and offer to try again. (A rejected login is already cleared by
        // the API client when it fails to refresh.)
        if (isNetworkError(err)) { setFailure(describeLoadFailure(err)); setScreen('loadFailed'); return; }
        await clearTokens();
        setScreen('login');
      }
    } else {
      setScreen('login');
    }
  };

  const fetchCounts = async () => {
    try {
      // limit 1: only the total is needed, and it counts every order, not just the first page
      const [orders, addrs] = await Promise.all([getOrders({ limit: 1 }), getAddresses()]);
      setOrderCount(orders.total);
      setAddressCount(addrs.length);
    } catch {}
  };

  const handleRequestOtp = async () => {
    const fullPhone = '+91' + phone;
    setBusy(true);
    setError(''); setErrorRef('');
    try {
      await requestOtp(fullPhone);
      const t = Date.now(); setNow(t); setResendAt(resendAvailableAt(t)); setResentNote(false);
      setScreen('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      setErrorRef(referenceOf(err));
    } finally {
      setBusy(false);
    }
  };

  // Ask for another code for the same number (after the wait). The old code stops working when the new one is sent.
  const handleResendOtp = async () => {
    if (resending || secondsLeft(resendAt, Date.now()) > 0) return;
    setResending(true); setError(''); setErrorRef(''); setResentNote(false);
    try {
      await requestOtp('+91' + phone);
      const t = Date.now(); setNow(t); setResendAt(resendAvailableAt(t));
      setOtp(''); setResentNote(true);
    } catch (err: any) {
      setError(err.message || 'Could not send a new code');
      setErrorRef(referenceOf(err));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullPhone = '+91' + phone;
    setBusy(true);
    setError(''); setErrorRef('');
    try {
      const result = await verifyOtp(fullPhone, otp);
      // Sync guest cart to server after login
      await syncLocalCartToServer().catch(() => {});
      const p = await getProfile();
      setProfile(p);
      fetchCounts();
      if (result.isNewUser || !p.name) {
        setEditName('');
        setScreen('editName');
      } else {
        setScreen('profile');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      setErrorRef(referenceOf(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setBusy(true);
    setError(''); setErrorRef('');
    try {
      const p = await updateProfile({ name: editName.trim() });
      setProfile(p);
      setScreen('profile');
    } catch (err: any) {
      setError(err.message || 'Failed to save name');
      setErrorRef(referenceOf(err));
    } finally {
      setBusy(false);
    }
  };

  const doLogout = async () => {
    await clearTokens();
    setProfile(null);
    setPhone('');
    setOtp('');
    setScreen('login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) doLogout();
    } else {
      Alert.alert('Log out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  if (screen === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (screen === 'loadFailed' && failure) {
    return <LoadFailed failure={failure} onRetry={async () => { setScreen('loading'); await checkAuth(); }} />;
  }

  // ── Not Logged In ──
  if (screen === 'login') {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authHeader}>
          <Text style={styles.authPageTitle}>Account</Text>
          <TouchableOpacity style={styles.themeToggleBtn} onPress={toggleTheme} activeOpacity={0.7}>
            {isDark ? (
              <Sun size={20} color={colors.textSecondary} strokeWidth={1.5} />
            ) : (
              <Moon size={20} color={colors.textSecondary} strokeWidth={1.5} />
            )}
          </TouchableOpacity>
        </View>
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
          <ErrorReference id={errorRef} />

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
          <ErrorReference id={errorRef} />

          <TouchableOpacity
            style={[styles.primaryBtn, (busy || otp.length < 6) && styles.disabledBtn]}
            onPress={handleVerifyOtp}
            disabled={busy || otp.length < 6}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Verifying...' : 'Verify'}</Text>
          </TouchableOpacity>

          {resentNote && !error ? <Text style={styles.noteText} accessibilityLiveRegion="polite">New code sent.</Text> : null}

          <TouchableOpacity
            onPress={handleResendOtp}
            disabled={resending || resendLeft > 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: resending || resendLeft > 0 }}
          >
            <Text style={[styles.ghostLink, (resending || resendLeft > 0) && styles.ghostLinkOff]}>{resendLabel(resendLeft, resending)}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setOtp(''); setError(''); setErrorRef(''); setScreen('login'); }}>
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
          <Text style={styles.authTitle}>Welcome to Juhar</Text>
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
          <ErrorReference id={errorRef} />

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
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          try { const p = await getProfile(); setProfile(p); } catch {}
          await fetchCounts();
          setRefreshing(false);
        }} tintColor={colors.primary} />
      }
    >
      {/* Profile Card */}
      <FadeInUp delay={0} duration={500}>
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
            <Text style={styles.profileName} numberOfLines={1}>{profile?.name || 'Juhar Customer'}</Text>
            <Text style={styles.profilePhone}>{profile?.phone}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RefreshButton onRefresh={async () => {
            setRefreshing(true);
            try { const p = await getProfile(); setProfile(p); } catch {}
            await fetchCounts();
            setRefreshing(false);
          }} />
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => { setEditName(profile?.name || ''); setScreen('editName'); }}
          >
            <Settings size={18} color={colors.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>
      </FadeInUp>

      {/* Quick Action Tiles — 3 column grid */}
      <FadeInUp delay={120} duration={500}>
      <View style={styles.tilesRow}>
        <TouchableOpacity style={styles.tile} onPress={() => navigation.navigate('Orders')} activeOpacity={0.7}>
          <View style={styles.tileIconWrap}>
            <Package size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Orders</Text>
          <Text style={styles.tileSub}>{orderCount} placed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} activeOpacity={0.7} onPress={() => navigation.navigate('Wishlist')}>
          <View style={styles.tileIconWrap}>
            <Heart size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Wishlist</Text>
          <Text style={styles.tileSub}>{savedCount} items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} activeOpacity={0.7} onPress={() => navigation.navigate('Addresses')}>
          <View style={styles.tileIconWrap}>
            <MapPin size={22} color={colors.textPrimary} strokeWidth={1.5} />
          </View>
          <Text style={styles.tileLabel}>Addresses</Text>
          <Text style={styles.tileSub}>{addressCount} saved</Text>
        </TouchableOpacity>
      </View>
      </FadeInUp>

      {/* Menu List Card */}
      <FadeInUp delay={240} duration={500}>
      <View style={styles.menuCard}>
        {/* Edit Profile */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setEditName(profile?.name || ''); setScreen('editName'); }}
          activeOpacity={0.7}
        >
          <View style={styles.menuLeft}>
            <User size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Edit Profile</Text>
          </View>
          <ChevronRight size={18} color={colors.textBrandLight} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Dark Mode Toggle */}
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            {isDark ? (
              <Moon size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            ) : (
              <Sun size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            )}
            <Text style={styles.menuLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.menuDivider} />

        {/* FAQs */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <HelpCircle size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            <Text style={styles.menuLabel}>FAQs</Text>
          </View>
          <ChevronRight size={18} color={colors.textBrandLight} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Help & Support */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <MessageCircle size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Help & Support</Text>
          </View>
          <View style={styles.menuRight}>
            <View style={styles.whatsappBadge}>
              <Text style={styles.whatsappText}>WhatsApp 24/7</Text>
            </View>
            <ChevronRight size={18} color={colors.textBrandLight} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Terms & Privacy */}
        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
          <View style={styles.menuLeft}>
            <FileText size={20} color={colors.textBrandLight} strokeWidth={1.5} />
            <Text style={styles.menuLabel}>Terms & Privacy</Text>
          </View>
          <ChevronRight size={18} color={colors.textBrandLight} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      </FadeInUp>

      {/* Log Out Button */}
      <FadeInUp delay={360} duration={500}>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <LogOut size={20} color={colors.error} strokeWidth={1.5} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      </FadeInUp>

      {/* App Version */}
      <FadeInUp delay={420} duration={400}>
      <View style={styles.versionWrap}>
        <Text style={styles.versionText}>Juhar v2.0.4</Text>
      </View>
      </FadeInUp>
    </ScrollView>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  // ── Auth screens ──
  authContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.margin },
  authHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56 },
  authPageTitle: { fontFamily: 'NotoSerif-Medium', fontSize: 20, color: colors.textPrimary, lineHeight: 26 },
  themeToggleBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
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
  ghostLinkOff: { color: colors.textTertiary },
  errorText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.error, marginBottom: spacing.sm },
  noteText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },

  // ── Profile (logged in) ──
  scrollContainer: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: spacing.margin, paddingBottom: 100 },

  // Profile Card
  profileCard: {
    marginTop: spacing.md, padding: spacing.md, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: 'DMSans-Medium', fontSize: 18, color: colors.white, letterSpacing: 0.5 },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: 'DMSans-Medium', fontSize: 18, color: colors.textPrimary, lineHeight: 22 },
  profilePhone: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textBrandLight, lineHeight: 22, marginTop: 1 },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },

  // Quick Action Tiles
  tilesRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.gutter },
  tile: {
    flex: 1, padding: spacing.md, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  tileIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  tileLabel: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.26 },
  tileSub: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textBrandLight, letterSpacing: 0.66, marginTop: 2 },

  // Menu Card
  menuCard: {
    marginTop: spacing.lg, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
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
  menuDivider: { height: 1, backgroundColor: colors.surfaceMuted, marginHorizontal: spacing.md },

  // WhatsApp badge
  whatsappBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full,
    backgroundColor: colors.statusDeliveredBg,
  },
  whatsappText: { fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.statusDeliveredText, letterSpacing: -0.1 },

  // Log Out
  logoutBtn: {
    marginTop: spacing.lg, height: 52, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  logoutText: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.error, letterSpacing: -0.16 },

  // Version
  versionWrap: { marginTop: spacing.xl, alignItems: 'center' },
  versionText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textTertiary },
});
