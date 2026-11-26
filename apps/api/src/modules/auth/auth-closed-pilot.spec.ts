import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

// The closed pilot: with the mock provider and a list of numbers, only those numbers can sign in.
const TEAM = '+919876543210';
const OUTSIDER = '+919123456789';

function setup(env: Record<string, string | undefined>, existingUser: { phone: string } | null = null) {
  const user = { id: 'user-1', phone: TEAM, name: null, email: null, verifiedAt: null, createdAt: new Date(), status: 'active' };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(existingUser ? { ...user, ...existingUser } : null),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ ...user, ...data })),
      update: jest.fn().mockResolvedValue(user),
    },
    adminUser: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed'), verify: jest.fn().mockReturnValue({ type: 'refresh', sub: 'user-1' }) };
  const config = { get: jest.fn((key: string) => (key in env ? env[key] : 'secret')) };
  const otpProvider = { sendOtp: jest.fn().mockResolvedValue({ otp: '123456', expiresAt: new Date(Date.now() + 300_000) }) };
  return { service: new AuthService(prisma as any, jwt as any, config as any, otpProvider as any), prisma, otpProvider };
}

describe('AuthService closed pilot', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const closed = { OTP_PROVIDER: 'mock', MOCK_OTP_ALLOWED_PHONES: `${TEAM},+918765432109` };

  it('lets a listed number ask for a code and sign in', async () => {
    const { service } = setup(closed);
    await service.requestOtp({ phone: TEAM } as any);
    await expect(service.verifyOtp({ phone: TEAM, otp: '123456' } as any)).resolves.toMatchObject({ accessToken: 'signed' });
  });

  it('refuses a number that is not listed, and sends nothing', async () => {
    const { service, otpProvider } = setup(closed);
    await expect(service.requestOtp({ phone: OUTSIDER } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.requestOtp({ phone: OUTSIDER } as any)).rejects.toThrow('LOGIN_NOT_OPEN');
    expect(otpProvider.sendOtp).not.toHaveBeenCalled();
  });

  it('refuses to verify an unlisted number even with the right code, and creates no user', async () => {
    const { service, prisma } = setup(closed);
    await expect(service.verifyOtp({ phone: OUTSIDER, otp: '123456' } as any)).rejects.toThrow('LOGIN_NOT_OPEN');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not keep someone in through an old refresh token once the pilot is closed', async () => {
    const { service } = setup(closed, { phone: OUTSIDER });
    await expect(service.refreshToken('old.refresh.token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('a listed number can still refresh', async () => {
    const { service } = setup(closed, { phone: TEAM });
    await expect(service.refreshToken('refresh.token')).resolves.toEqual({ accessToken: 'signed' });
  });

  it('does not log the unlisted number in full', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');
    const { service } = setup(closed);
    await service.requestOtp({ phone: OUTSIDER } as any).catch(() => undefined);
    const lines = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(lines).toContain('+91******6789');
    expect(lines).not.toContain(OUTSIDER);
  });

  it('with no list (local development) every number may sign in', async () => {
    const { service } = setup({ OTP_PROVIDER: 'mock', MOCK_OTP_ALLOWED_PHONES: undefined });
    await expect(service.requestOtp({ phone: OUTSIDER } as any)).resolves.toBeDefined();
  });

  it('with a real SMS provider the list is not used', async () => {
    const { service } = setup({ OTP_PROVIDER: 'msg91', MOCK_OTP_ALLOWED_PHONES: TEAM });
    await expect(service.requestOtp({ phone: OUTSIDER } as any)).resolves.toBeDefined();
  });
});
