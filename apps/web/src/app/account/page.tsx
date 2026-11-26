'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  User, MapPin, Heart, Package, HelpCircle, MessageCircle,
  LogOut, ChevronRight, FileText, Settings, ShieldCheck, Truck, Sun, Moon,
} from 'lucide-react';
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
} from '@/lib/api';
import { useWishlist } from '@/lib/wishlist-context';
import { readLocalCart, clearLocalCart } from '@/lib/cart-events';
import { useTheme } from '@/lib/theme-context';
import ErrorReference from '@/components/ErrorReference';
import { resendAvailableAt, secondsLeft, resendLabel } from '@/lib/resend';

type Screen = 'loading' | 'login' | 'otp' | 'profile' | 'editName';

export default function AccountPage() {
  const { isDark, toggleTheme } = useTheme();
  const [screen, setScreen] = useState<Screen>('loading');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorRef, setErrorRef] = useState(''); // the API's reference for the failed request
  const [resendAt, setResendAt] = useState(0);   // when "Resend code" works again (ms)
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const [resentNote, setResentNote] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const { total: wishlistCount, refreshWishlist } = useWishlist();

  useEffect(() => { checkAuth(); refreshWishlist(); }, [refreshWishlist]);

  // tick once a second while the code screen counts down to "Resend code"
  const resendLeft = secondsLeft(resendAt, now);
  useEffect(() => {
    if (screen !== 'otp' || resendLeft <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [screen, resendLeft]);

  const checkAuth = async () => {
    const hasToken = loadToken();
    if (hasToken) {
      try {
        setProfile(await getProfile());
        setScreen('profile');
        fetchCounts();
      } catch { clearTokens(); setScreen('login'); }
    } else setScreen('login');
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
    setBusy(true); setError(''); setErrorRef('');
    try {
      await requestOtp('+91' + phone);
      const t = Date.now(); setNow(t); setResendAt(resendAvailableAt(t)); setResentNote(false);
      setScreen('otp');
    }
    catch (e: any) { setError(e.message || 'Failed to send OTP'); setErrorRef(referenceOf(e)); }
    finally { setBusy(false); }
  };

  // Ask for another code for the same number (after the wait). The old code stops working when the new one is sent.
  const handleResendOtp = async () => {
    if (resending || secondsLeft(resendAt, Date.now()) > 0) return;
    setResending(true); setError(''); setErrorRef(''); setResentNote(false);
    try {
      await requestOtp('+91' + phone);
      const t = Date.now(); setNow(t); setResendAt(resendAvailableAt(t));
      setOtp(''); setResentNote(true);
    } catch (e: any) { setError(e.message || 'Could not send a new code'); setErrorRef(referenceOf(e)); }
    finally { setResending(false); }
  };

  const handleVerifyOtp = async () => {
    setBusy(true); setError(''); setErrorRef('');
    try {
      const result = await verifyOtp('+91' + phone, otp);
      // Sync local cart
      const localCart = readLocalCart();
      if (localCart.length > 0) {
        const { addToCart } = await import('@/lib/api');
        for (const item of localCart) {
          try { await addToCart(item.variantId, item.quantity); } catch {}
        }
        clearLocalCart();
      }
      const p = await getProfile(); setProfile(p);
      fetchCounts();
      if (result.isNewUser || !p.name) { setEditName(''); setScreen('editName'); }
      else setScreen('profile');
    } catch (e: any) { setError(e.message || 'Invalid OTP'); setErrorRef(referenceOf(e)); }
    finally { setBusy(false); }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim().length < 2) return;
    setBusy(true); setError(''); setErrorRef('');
    try { const p = await updateProfile({ name: editName.trim() }); setProfile(p); setScreen('profile'); }
    catch (e: any) { setError(e.message || 'Failed to save name'); setErrorRef(referenceOf(e)); }
    finally { setBusy(false); }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      clearTokens(); setProfile(null); setPhone(''); setOtp(''); setScreen('login');
    }
  };

  if (screen === 'loading') return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Login
  // ── Shared brand hero for mobile/tablet ──
  const MobileBrandHero = () => (
    <div className="lg:hidden bg-primary rounded-2xl p-6 mb-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
      <span className="font-serif text-[32px] text-white tracking-tight relative">Juhar</span>
      <span className="font-sans text-body-lg text-white/70 ml-2 relative">ଜୁହାର୍</span>
      <p className="font-sans text-body-sm text-white/60 mt-2 relative">Handloom traditions of Western Odisha</p>
      <div className="flex items-center justify-center gap-5 mt-4 relative">
        {[
          { icon: ShieldCheck, label: 'GI Certified' },
          { icon: Truck, label: 'Free Ship' },
          { icon: Package, label: 'Sacred Pack' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-white/50">
            <Icon size={14} strokeWidth={1.5} />
            <span className="font-sans text-[10px] uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Desktop brand panel ──
  const DesktopBrandPanel = ({ subtitle }: { subtitle: string }) => (
    <div className="hidden lg:flex flex-col items-center justify-center bg-primary text-white p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)' }} />
      <span className="font-serif text-[44px] tracking-tight mb-1 relative">Juhar</span>
      <span className="font-sans text-[18px] text-white/70 mb-6 relative">ଜୁହାର୍</span>
      <div className="w-12 h-px bg-white/25 mb-6" />
      <p className="font-sans text-body-lg text-white/70 text-center leading-relaxed max-w-[240px] relative">{subtitle}</p>
      <div className="mt-10 flex items-center gap-6 text-white/50 relative">
        {[
          { icon: ShieldCheck, label: 'GI Certified' },
          { icon: Truck, label: 'Free Shipping' },
          { icon: Package, label: 'Sacred Packaging' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <Icon size={18} strokeWidth={1.5} />
            <span className="font-sans text-[9px] uppercase tracking-[0.15em]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Login
  if (screen === 'login') return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px] lg:max-w-[920px]">
        {/* Mobile/Tablet brand hero */}
        <MobileBrandHero />

        <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-[0_4px_24px_rgba(0,0,0,0.06)] lg:border lg:border-border">
          <DesktopBrandPanel subtitle="Authentic Sambalpuri handloom sarees, direct from master weavers of Western Odisha." />

          {/* Form */}
          <div className="bg-surface rounded-2xl lg:rounded-none shadow-[0_2px_16px_rgba(0,0,0,0.04)] lg:shadow-none border border-border lg:border-0 p-6 md:p-8 lg:p-10 flex flex-col justify-center">
            <h1 className="font-serif text-headline-lg-mobile text-text-primary mb-1">Welcome back</h1>
            <p className="font-sans text-body-md text-text-secondary mb-6 md:mb-8">Enter your phone number to continue.</p>

            <div className="mb-5">
              <label className="label-upper block mb-2">PHONE NUMBER</label>
              <div className="flex">
                <div className="h-12 md:h-14 px-4 bg-surface-container-low rounded-l-xl flex items-center border border-r-0 border-border">
                  <span className="font-sans text-body-md text-text-secondary font-medium">+91</span>
                </div>
                <input
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210" maxLength={10} autoFocus
                  className="flex-1 h-12 md:h-14 bg-surface rounded-r-xl border border-border px-4 font-sans text-body-lg text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {error && <p className="font-sans text-body-sm text-error mb-1">{error}</p>}
            <ErrorReference id={errorRef} className="mb-3" />

            <button className="btn-primary w-full !h-12 md:!h-14 !rounded-xl !text-title-sm" onClick={handleRequestOtp} disabled={busy || phone.length < 10}>
              {busy ? 'Sending...' : 'Send OTP'}
            </button>

            <p className="font-sans text-body-sm text-text-tertiary text-center mt-6">
              By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms</a> & <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // OTP
  if (screen === 'otp') return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px] lg:max-w-[920px]">
        <MobileBrandHero />

        <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:rounded-2xl lg:overflow-hidden lg:shadow-[0_4px_24px_rgba(0,0,0,0.06)] lg:border lg:border-border">
          <DesktopBrandPanel subtitle="Almost there! Verify your number to access your account." />

          <div className="bg-surface rounded-2xl lg:rounded-none shadow-[0_2px_16px_rgba(0,0,0,0.04)] lg:shadow-none border border-border lg:border-0 p-6 md:p-8 lg:p-10 flex flex-col justify-center">
            <h1 className="font-serif text-headline-lg-mobile text-text-primary mb-1">Verify your number</h1>
            <p className="font-sans text-body-md text-text-secondary mb-6 md:mb-8">
              OTP sent to <strong className="text-text-primary">+91 {phone}</strong>
            </p>

            <div className="mb-5">
              <label className="label-upper block mb-2">ENTER 6-DIGIT OTP</label>
              <input
                type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="● ● ● ● ● ●"
                maxLength={6} autoFocus
                className="w-full h-14 md:h-16 bg-surface rounded-xl border border-border px-3 font-sans text-[28px] md:text-[32px] text-center tracking-[12px] font-semibold text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>

            {error && <p className="font-sans text-body-sm text-error mb-1">{error}</p>}
            <ErrorReference id={errorRef} className="mb-3" />
            {resentNote && !error && <p role="status" className="font-sans text-body-sm text-text-secondary mb-3">New code sent.</p>}

            <button className="btn-primary w-full !h-12 md:!h-14 !rounded-xl !text-title-sm" onClick={handleVerifyOtp} disabled={busy || otp.length < 6}>
              {busy ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="flex items-center justify-between mt-5">
              <button className="font-sans text-body-md text-primary hover:underline" onClick={() => { setOtp(''); setError(''); setErrorRef(''); setScreen('login'); }}>
                ← Change number
              </button>
              <button
                className="font-sans text-body-sm text-primary hover:underline disabled:text-text-tertiary disabled:no-underline disabled:cursor-not-allowed"
                onClick={handleResendOtp} disabled={resending || resendLeft > 0}
              >
                {resendLabel(resendLeft, resending)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Name capture
  if (screen === 'editName') return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[460px]">
        {/* Compact brand strip for mobile */}
        <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
          <span className="font-serif text-headline-md text-primary">Juhar</span>
          <span className="font-sans text-body-md text-on-surface-variant/70">ଜୁହାର୍</span>
        </div>

        <div className="bg-surface rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-border p-6 md:p-8 lg:p-10 text-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5">
            <User size={32} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-headline-lg-mobile text-text-primary mb-1">Welcome to Juhar</h1>
          <p className="font-sans text-body-md text-text-secondary mb-8">What should we call you?</p>

          <div className="mb-5 text-left">
            <label className="label-upper block mb-2">YOUR NAME</label>
            <input
              type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Priya Mohanty" autoFocus
              className="w-full h-12 md:h-14 bg-surface rounded-xl border border-border px-4 font-sans text-body-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          {error && <p className="font-sans text-body-sm text-error mb-1">{error}</p>}
            <ErrorReference id={errorRef} className="mb-3" />

          <button className="btn-primary w-full !h-12 md:!h-14 !rounded-xl !text-title-sm" onClick={handleSaveName} disabled={busy || editName.trim().length < 2}>
            {busy ? 'Saving...' : 'Continue'}
          </button>
          <button className="font-sans text-body-md text-text-tertiary mt-4 hover:text-primary transition-colors" onClick={() => setScreen('profile')}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  // Profile
  const initials = profile?.name ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '';

  return (
    <div className="page-container py-6 lg:py-10">
      <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary mb-6 lg:mb-8">My Account</h1>

      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8">
        {/* Left sidebar — profile card + logout */}
        <div>
          <div className="card flex flex-col items-center text-center lg:py-8">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-primary flex items-center justify-center mb-3">
              <span className="font-sans text-[24px] lg:text-[32px] font-medium text-white tracking-wide">{initials || '?'}</span>
            </div>
            <p className="font-sans text-[18px] lg:text-[20px] font-medium text-text-primary">{profile?.name || 'Juhar Customer'}</p>
            <p className="font-sans text-body-md text-outline mt-1">{profile?.phone}</p>
            <button
              onClick={() => { setEditName(profile?.name || ''); setScreen('editName'); }}
              className="mt-4 px-4 py-2 rounded-lg bg-surface-container-low text-text-secondary font-sans text-body-sm font-medium hover:bg-surface-container transition-colors flex items-center gap-1.5"
            >
              <Settings size={14} strokeWidth={1.5} /> Edit Profile
            </button>
          </div>

          {/* Logout — desktop only in sidebar */}
          <button onClick={handleLogout} className="hidden lg:flex card w-full mt-4 items-center justify-center gap-2 !py-3 group hover:border-error/30 transition-colors">
            <LogOut size={20} className="text-error" strokeWidth={1.5} />
            <span className="font-sans text-title-sm text-error font-medium">Log Out</span>
          </button>
          <p className="hidden lg:block font-sans text-body-sm text-text-tertiary text-center mt-4">Juhar v2.0.4</p>
        </div>

        {/* Right content */}
        <div>
          {/* Quick action tiles */}
          <div className="grid grid-cols-3 lg:grid-cols-3 gap-gutter mt-6 lg:mt-0">
            {[
              { href: '/orders', Icon: Package, label: 'Orders', sub: `${orderCount} placed`, desc: 'Track your handloom orders' },
              { href: '/wishlist', Icon: Heart, label: 'Wishlist', sub: `${wishlistCount} items`, desc: 'Your wishlist collection' },
              { href: '/account/addresses', Icon: MapPin, label: 'Addresses', sub: `${addressCount} saved`, desc: 'Manage delivery addresses' },
            ].map(({ href, Icon, label, sub, desc }) => (
              <Link key={label} href={href} className="card flex flex-col items-center lg:flex-row lg:items-center lg:gap-4 text-center lg:text-left group hover:shadow-md transition-shadow">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-1 lg:mb-0 shrink-0 group-hover:bg-primary/10 transition-colors">
                  <Icon size={22} className="text-text-primary group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <span className="font-sans text-label-md lg:text-title-sm text-text-primary font-medium block">{label}</span>
                  <span className="font-sans text-label-sm text-outline mt-0.5 block">{sub}</span>
                  <span className="font-sans text-body-sm text-text-tertiary mt-0.5 hidden lg:block">{desc}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Menu items as cards on desktop */}
          <div className="card mt-6 overflow-hidden !p-0 lg:grid lg:grid-cols-2 lg:!p-0 lg:gap-0">
            {[
              { Icon: User, label: 'Edit Profile', desc: 'Update your name and details', onClick: () => { setEditName(profile?.name || ''); setScreen('editName'); } },
              { Icon: isDark ? Moon : Sun, label: isDark ? 'Dark Mode' : 'Light Mode', desc: 'Switch appearance', onClick: toggleTheme, toggle: true },
              { Icon: HelpCircle, label: 'FAQs', desc: 'Common questions answered' },
              { Icon: MessageCircle, label: 'Help & Support', desc: 'Chat with us anytime', badge: 'WhatsApp 24/7' },
              { Icon: FileText, label: 'Terms & Privacy', desc: 'Legal and privacy policies' },
            ].map(({ Icon, label, desc, onClick, badge, toggle }, idx, arr) => (
              <div key={label} className={`${idx < arr.length - 1 ? 'lg:border-b lg:border-r border-surface-container-high' : ''}`}>
                <button onClick={onClick} className="w-full h-[52px] lg:h-[72px] px-4 lg:px-6 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="hidden lg:flex w-10 h-10 rounded-full bg-surface-container-low items-center justify-center shrink-0">
                      <Icon size={20} className="text-outline" strokeWidth={1.5} />
                    </div>
                    <Icon size={20} className="text-outline lg:hidden" strokeWidth={1.5} />
                    <div className="text-left">
                      <span className="font-sans text-body-md text-text-primary block">{label}</span>
                      <span className="font-sans text-body-sm text-text-tertiary hidden lg:block">{desc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge && <span className="px-2 py-0.5 rounded-full bg-status-delivered-bg text-status-delivered-text font-sans text-label-sm font-semibold">{badge}</span>}
                    {toggle ? (
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${isDark ? 'bg-primary' : 'bg-surface-container-high'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isDark ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    ) : (
                      <ChevronRight size={18} className="text-outline/60" />
                    )}
                  </div>
                </button>
                {/* Mobile divider only */}
                {idx < arr.length - 1 && <div className="h-px bg-surface-container-high mx-4 lg:hidden" />}
              </div>
            ))}
          </div>

          {/* Logout — mobile only */}
          <button onClick={handleLogout} className="lg:hidden card w-full mt-6 flex items-center justify-center gap-2 !py-3 group">
            <LogOut size={20} className="text-error group-active:scale-95 transition-transform" strokeWidth={1.5} />
            <span className="font-sans text-title-sm text-error font-medium">Log Out</span>
          </button>
          <p className="lg:hidden font-sans text-body-sm text-text-tertiary text-center mt-8">Juhar v2.0.4</p>
        </div>
      </div>
    </div>
  );
}
