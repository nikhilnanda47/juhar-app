/**
 * Keeps personal data and secrets out of the logs.
 * Callers should still avoid logging them; this is the safety net for what slips through
 * (database error text, exception messages).
 */

/** +919876543210 -> +91******3210 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `+91******${digits.slice(-4)}` : '******';
}

// An Indian mobile number: optional +, 91, then 10 digits starting 6-9, not part of a longer number
const PHONE = /(?<!\d)\+?91[6-9]\d{5}(\d{4})(?!\d)/g;
// A JSON web token (login and refresh tokens)
const TOKEN = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;

export function redact(text: string): string {
  return text.replace(PHONE, '+91******$1').replace(TOKEN, '[token]');
}
