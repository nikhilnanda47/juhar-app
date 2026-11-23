import { Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

// What the login flow writes to the log, and what it must keep out of it.
const PHONE = '+919876543210';

function setup(opts: { existingUser?: boolean; admin?: boolean } = {}) {
  const user = { id: 'user-1', phone: PHONE, name: null, email: null, verifiedAt: null, createdAt: new Date() };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.existingUser ? user : null),
      create: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue(user),
    },
    adminUser: { findUnique: jest.fn().mockResolvedValue(opts.admin ? { role: 'owner' } : null) },
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed.token.value') };
  const config = { get: jest.fn().mockReturnValue('secret') };
  const otpProvider = { sendOtp: jest.fn().mockResolvedValue({ otp: '123456', expiresAt: new Date(Date.now() + 300_000) }) };
  return { service: new AuthService(prisma as any, jwt as any, config as any, otpProvider as any) };
}

describe('AuthService logging', () => {
  let log: jest.SpyInstance, warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); warn.mockRestore(); });
  const lines = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => String(c[0]));

  it('logs that an OTP was sent, with the phone number masked', async () => {
    await setup().service.requestOtp({ phone: PHONE } as any);
    expect(lines(log)).toContain('otp sent to +91******3210');
  });

  it('logs a successful login with the user and type, and never the phone number or tokens', async () => {
    const { service } = setup();
    await service.requestOtp({ phone: PHONE } as any);
    log.mockClear();
    await service.verifyOtp({ phone: PHONE, otp: '123456' } as any);
    const text = lines(log).join('\n');
    expect(text).toContain('login ok user=user-1 type=customer new=true');
    expect(text).not.toContain('9876543210');
    expect(text).not.toContain('signed.token.value');
  });

  it('says whether the customer is new, and whether they are an admin', async () => {
    const { service } = setup({ existingUser: true, admin: true });
    await service.requestOtp({ phone: PHONE } as any);
    log.mockClear();
    await service.verifyOtp({ phone: PHONE, otp: '123456' } as any);
    expect(lines(log)).toContain('login ok user=user-1 type=admin new=false');
  });

  it('logs a wrong code as a warning with the attempt number and the masked phone', async () => {
    const { service } = setup();
    await service.requestOtp({ phone: PHONE } as any);
    await expect(service.verifyOtp({ phone: PHONE, otp: '000000' } as any)).rejects.toThrow(UnauthorizedException);
    await expect(service.verifyOtp({ phone: PHONE, otp: '000001' } as any)).rejects.toThrow(UnauthorizedException);
    expect(lines(warn)).toEqual([
      'otp verify failed for +91******3210 (attempt 1 of 5)',
      'otp verify failed for +91******3210 (attempt 2 of 5)',
    ]);
    expect(lines(warn).join(' ')).not.toContain('9876543210');
  });

  it('does not log a login for a wrong code', async () => {
    const { service } = setup();
    await service.requestOtp({ phone: PHONE } as any);
    log.mockClear();
    await expect(service.verifyOtp({ phone: PHONE, otp: '000000' } as any)).rejects.toThrow();
    expect(lines(log).filter((l) => l.startsWith('login ok'))).toEqual([]);
  });
});
