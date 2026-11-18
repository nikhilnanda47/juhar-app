'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleOtpDigit = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digits = otp.split('');
    digits[index] = value.slice(-1);
    const newOtp = digits.join('').slice(0, 6);
    setOtp(newOtp.padEnd(6, '').trimEnd());

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestOtp(phone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyOtp(phone, otp);
      api.setToken(result.accessToken);
      localStorage.setItem('sajani_admin_refresh', result.refreshToken);

      // Verify admin access
      const me = await api.getMe();
      if (me.type !== 'admin') {
        api.clearToken();
        setError('This account does not have admin access.');
        return;
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Brand Panel */}
      <div className={styles.brandPanel}>
        <div className={styles.brandDecor} />
        <div className={styles.brandContent}>
          <h1 className={styles.brandName}>Sajani</h1>
          <p className={styles.brandSubtitle}>Admin Portal</p>
          <div className={styles.brandDivider} />
          <p className={styles.brandTagline}>
            Manage your store, track orders, and grow your business.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.formHeader}>
            <h2 className={styles.welcomeTitle}>Welcome back</h2>
            <p className={styles.welcomeSubtitle}>Sign in to manage your store</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Phone Number</label>
                <input
                  className={styles.input}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                />
                <p className={styles.hint}>Enter your admin phone number. Dev OTP: 123456</p>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button className={styles.button} type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Enter OTP</label>
                <div className={styles.otpRow} onPaste={handleOtpPaste}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className={`${styles.otpBox} ${otp[i] ? styles.otpBoxFilled : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ''}
                      onChange={(e) => handleOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <p className={styles.hint}>OTP sent to {phone}. Dev OTP: <strong>123456</strong></p>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button className={styles.button} type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Login'}
              </button>
              <button
                className={styles.changeLink}
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              >
                Change number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
