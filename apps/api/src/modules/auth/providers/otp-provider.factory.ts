import { resolveOtpProvider } from '../../../config/otp-provider';
import { MockOtpProvider } from './mock-otp.provider';
import { OtpProvider } from './otp-provider.interface';

/** Builds the OTP provider named by the OTP_PROVIDER setting. */
export function createOtpProvider(setting: unknown): OtpProvider {
  const name = resolveOtpProvider(setting);
  switch (name) {
    case 'mock':
      return new MockOtpProvider();
    default:
      throw new Error(`Unsupported OTP_PROVIDER "${name}"`);
  }
}
