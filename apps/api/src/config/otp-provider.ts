/**
 * Which OTP provider the API uses, from the OTP_PROVIDER setting.
 * Unset means "mock", so local development needs no setting.
 * A real SMS provider is added to SUPPORTED_OTP_PROVIDERS when it is built.
 */
export const SUPPORTED_OTP_PROVIDERS = ['mock'] as const;

export function resolveOtpProvider(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : 'mock';
}
