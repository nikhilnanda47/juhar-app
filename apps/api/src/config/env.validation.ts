import { LOG_LEVEL_NAMES, resolveLogLevel } from './log-level';
import { SUPPORTED_OTP_PROVIDERS, resolveOtpProvider } from './otp-provider';
import { parseAllowedPhones } from './otp-allowlist';

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_ENV.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy apps/api/.env.example to apps/api/.env and set them.',
    );
  }

  const logLevel = resolveLogLevel(config.LOG_LEVEL);
  if (!(LOG_LEVEL_NAMES as readonly string[]).includes(logLevel)) {
    throw new Error(`Unsupported LOG_LEVEL "${logLevel}". Supported values: ${LOG_LEVEL_NAMES.join(', ')}.`);
  }

  const otpProvider = resolveOtpProvider(config.OTP_PROVIDER);
  if (!(SUPPORTED_OTP_PROVIDERS as readonly string[]).includes(otpProvider)) {
    throw new Error(
      `Unsupported OTP_PROVIDER "${otpProvider}". Supported values: ${SUPPORTED_OTP_PROVIDERS.join(', ')}.`,
    );
  }

  // A badly written number is a typo that would lock someone out (or let the wrong person in): stop at start-up.
  const allowedPhones = parseAllowedPhones(config.MOCK_OTP_ALLOWED_PHONES);

  // The mock provider accepts the code 123456, so on a live environment it is only allowed as a CLOSED pilot:
  // MOCK_OTP_ALLOWED_PHONES names the few numbers that may sign in and everyone else is refused.
  if (otpProvider === 'mock' && config.NODE_ENV === 'production' && allowedPhones.length === 0) {
    throw new Error(
      'Refusing to start: NODE_ENV is "production" but the OTP provider is "mock" (OTP_PROVIDER is unset or "mock"). ' +
        'The mock provider accepts the code 123456 for any phone number, so anyone could sign in as any user, ' +
        'including the admin. Set OTP_PROVIDER to a real SMS provider, or, for a closed pilot, list the only ' +
        'phone numbers allowed to sign in in MOCK_OTP_ALLOWED_PHONES (for example +919876543210,+919123456789).',
    );
  }

  return config;
}
