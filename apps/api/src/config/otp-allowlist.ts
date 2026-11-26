/**
 * The closed pilot login. While the mock provider is on (the fixed code 123456), MOCK_OTP_ALLOWED_PHONES
 * lists the only phone numbers allowed to sign in: the owner's and the team's. Every other number is refused.
 * With a real SMS provider the list is not used at all.
 */
const INDIAN_MOBILE = /^\+91[6-9]\d{9}$/;

/**
 * "+919876543210, +919123456789" -> the numbers. Separate them with commas (semicolons or new lines also work).
 * Empty or unset gives an empty list. Throws on a badly written number, naming it as it was typed.
 */
export function parseAllowedPhones(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const entries = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const bad = entries.filter((p) => !INDIAN_MOBILE.test(p));
  if (bad.length > 0) {
    throw new Error(
      `MOCK_OTP_ALLOWED_PHONES has ${bad.length === 1 ? 'a number' : 'numbers'} that ${bad.length === 1 ? 'is' : 'are'} ` +
        `not written as +91 and ten digits with no spaces: ${bad.map((b) => `"${b}"`).join(', ')}. Separate numbers with commas.`,
    );
  }
  return [...new Set(entries)];
}
