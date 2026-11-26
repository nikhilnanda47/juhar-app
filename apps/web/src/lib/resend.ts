// "Resend code" on the sign-in screen: the link works again a little after a code was asked for, and until then
// says how long is left. The API refuses a new code for the same number for 30 seconds (and allows only 3 per
// 10 minutes), so the wait here matches it instead of letting people tap into an error.

import { AUTH } from '@juhar/shared';

/** Seconds to wait between codes: the same number the API holds to. */
export const RESEND_WAIT_SECONDS: number = AUTH.OTP_RESEND_SECONDS;

/** When the link works again, as a time in milliseconds, for a code asked for at `sentAtMs`. */
export function resendAvailableAt(sentAtMs: number, waitSeconds: number = RESEND_WAIT_SECONDS): number {
  return sentAtMs + waitSeconds * 1000;
}

/** Whole seconds left until `availableAtMs` (0 once it has passed). */
export function secondsLeft(availableAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((availableAtMs - nowMs) / 1000));
}

/** The words on the link: counting down, then plain "Resend code". */
export function resendLabel(left: number, busy = false): string {
  if (busy) return 'Sending...';
  return left > 0 ? `Resend code in ${left}s` : 'Resend code';
}
