import { SUPPORTED_OTP_PROVIDERS, resolveOtpProvider } from './otp-provider';

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

  const otpProvider = resolveOtpProvider(config.OTP_PROVIDER);
  if (!(SUPPORTED_OTP_PROVIDERS as readonly string[]).includes(otpProvider)) {
    throw new Error(
      `Unsupported OTP_PROVIDER "${otpProvider}". Supported values: ${SUPPORTED_OTP_PROVIDERS.join(', ')}.`,
    );
  }

  // The mock provider accepts the code 123456 for every phone number, including the admin's.
  if (otpProvider === 'mock' && config.NODE_ENV === 'production') {
    throw new Error(
      'Refusing to start: NODE_ENV is "production" but the OTP provider is "mock" (OTP_PROVIDER is unset or "mock"). ' +
        'The mock provider accepts the code 123456 for any phone number, so anyone could sign in as any user, ' +
        'including the admin. Set OTP_PROVIDER to a real SMS provider.',
    );
  }

  return config;
}
