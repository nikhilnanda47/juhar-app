import { RESEND_WAIT_SECONDS, resendAvailableAt, secondsLeft, resendLabel } from './resend';

describe('resend code timing', () => {
  it('waits 30 seconds, the same as the API', () => {
    expect(RESEND_WAIT_SECONDS).toBe(30);
  });

  it('works out when the link is available again', () => {
    expect(resendAvailableAt(1_000_000)).toBe(1_030_000);
    expect(resendAvailableAt(1_000_000, 10)).toBe(1_010_000);
  });

  it('counts the seconds left, rounding up, never below 0', () => {
    const at = resendAvailableAt(0);
    expect(secondsLeft(at, 0)).toBe(30);
    expect(secondsLeft(at, 100)).toBe(30);   // 29.9s left still reads 30, not 29 (never offers the link early)
    expect(secondsLeft(at, 1_000)).toBe(29);
    expect(secondsLeft(at, 29_001)).toBe(1);
    expect(secondsLeft(at, 30_000)).toBe(0);
    expect(secondsLeft(at, 90_000)).toBe(0);
  });

  it('says how long is left, then plain Resend code', () => {
    expect(resendLabel(24)).toBe('Resend code in 24s');
    expect(resendLabel(0)).toBe('Resend code');
  });

  it('says Sending while the request is out', () => {
    expect(resendLabel(0, true)).toBe('Sending...');
  });
});
