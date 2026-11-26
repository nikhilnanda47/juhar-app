// Who is an admin is decided by the login's link to its staff record (admin_users.user_id), never by the phone number,
// and only while that record is active. The staff role goes into the access token.
import { Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

const PHONE = '+919876543210';

function setup(admin: { role: string; status: string } | null) {
  const user = { id: 'user-1', phone: PHONE, name: 'Owner', email: null, verifiedAt: null, createdAt: new Date(), status: 'active' };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(user),
    },
    adminUser: { findUnique: jest.fn().mockResolvedValue(admin) },
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed'), verify: jest.fn().mockReturnValue({ type: 'refresh', sub: 'user-1' }) };
  const settings: Record<string, string | undefined> = { OTP_PROVIDER: 'mock', MOCK_OTP_ALLOWED_PHONES: undefined };
  const config = { get: jest.fn((key: string) => (key in settings ? settings[key] : 'secret')) };
  const otpProvider = { sendOtp: jest.fn().mockResolvedValue({ otp: '123456', expiresAt: new Date(Date.now() + 300_000) }) };
  const service = new AuthService(prisma as any, jwt as any, config as any, otpProvider as any);
  const accessPayload = () => jwt.sign.mock.calls[0][0];
  return { service, prisma, jwt, accessPayload };
}

describe('AuthService: admin or customer', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  const signIn = async (s: ReturnType<typeof setup>) => {
    await s.service.requestOtp({ phone: PHONE } as any);
    await s.service.verifyOtp({ phone: PHONE, otp: '123456' } as any);
  };

  it('looks the staff record up by the login\'s id, not by phone', async () => {
    const s = setup({ role: 'owner', status: 'active' });
    await signIn(s);
    expect(s.prisma.adminUser.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('an active admin gets an admin token with their role', async () => {
    const s = setup({ role: 'catalog_editor', status: 'active' });
    await signIn(s);
    expect(s.accessPayload()).toMatchObject({ sub: 'user-1', type: 'admin', role: 'catalog_editor' });
  });

  it('a login with no staff record is a customer, with no role', async () => {
    const s = setup(null);
    await signIn(s);
    expect(s.accessPayload()).toMatchObject({ sub: 'user-1', type: 'customer' });
    expect(s.accessPayload()).not.toHaveProperty('role');
  });

  it('a suspended admin signs in as an ordinary customer', async () => {
    const s = setup({ role: 'owner', status: 'suspended' });
    await signIn(s);
    expect(s.accessPayload()).toMatchObject({ type: 'customer' });
    expect(s.accessPayload()).not.toHaveProperty('role');
  });

  it('a refreshed access token follows the same rule (link, and active), so a suspension takes effect within minutes', async () => {
    const active = setup({ role: 'owner', status: 'active' });
    await active.service.refreshToken('refresh.token');
    expect(active.prisma.adminUser.findUnique).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(active.accessPayload()).toMatchObject({ type: 'admin', role: 'owner' });

    const suspended = setup({ role: 'owner', status: 'suspended' });
    await suspended.service.refreshToken('refresh.token');
    expect(suspended.accessPayload()).toMatchObject({ type: 'customer' });
  });
});
