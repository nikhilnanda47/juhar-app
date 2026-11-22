import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/** Limits for rate limiting. Windows are in milliseconds. */
export const THROTTLE_LIMITS = {
  /** Every endpoint: requests per minute for one logged-in user (or one IP when logged out). */
  api: { ttl: 60_000, limit: 100 },
  /** OTP endpoints use a 10 minute window. */
  otpWindowMs: 600_000,
  /** POST /auth/otp/request */
  otpRequestPerPhone: 3,
  otpRequestPerIp: 10,
  /** POST /auth/otp/verify (right or wrong, every attempt counts) */
  otpVerifyPerPhone: 5,
  otpVerifyPerIp: 20,
} as const;

/** Marks the OTP endpoints, which get the per-phone and per-IP limits on top of the general one. */
export const OTP_THROTTLE = 'juhar:otp-throttle';
export const OtpThrottle = () => SetMetadata(OTP_THROTTLE, true);

const notOtpRoute = (context: ExecutionContext): boolean =>
  !Reflect.getMetadata(OTP_THROTTLE, context.getHandler());

const ipTracker = (req: Record<string, any>): string => `ip:${req.ip}`;

/** The phone number in the request body. Guards run before validation, so treat it as untrusted text. */
const phoneTracker = (req: Record<string, any>): string => {
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  return phone ? `phone:${phone}` : ipTracker(req);
};

/**
 * Logged-in callers are counted per user so that many customers sharing one
 * IP (mobile carriers, offices) do not block each other. The token is verified,
 * so a made-up token cannot be used to get a fresh allowance: anything that
 * does not verify (missing, expired, forged) is counted by IP instead.
 */
export function createUserOrIpTracker(jwt: JwtService) {
  return (req: Record<string, any>): string => {
    const header: unknown = req.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify<{ sub?: unknown }>(header.slice(7));
        if (typeof payload.sub === 'string' && payload.sub) return `user:${payload.sub}`;
      } catch {
        // fall through to the IP address
      }
    }
    return ipTracker(req);
  };
}

export function createThrottlerOptions(jwt: JwtService): ThrottlerModuleOptions {
  return {
    getTracker: createUserOrIpTracker(jwt),
    throttlers: [
      { name: 'default', ...THROTTLE_LIMITS.api },
      {
        name: 'otp-phone',
        ttl: THROTTLE_LIMITS.otpWindowMs,
        limit: THROTTLE_LIMITS.otpVerifyPerPhone,
        skipIf: notOtpRoute,
        getTracker: phoneTracker,
      },
      {
        name: 'otp-ip',
        ttl: THROTTLE_LIMITS.otpWindowMs,
        limit: THROTTLE_LIMITS.otpVerifyPerIp,
        skipIf: notOtpRoute,
        getTracker: ipTracker,
      },
    ],
  };
}
