import { parseCreateAdminArgs } from './admin-bootstrap';

const ok = ['--phone', '+919876543210', '--name', 'Owner One'];

describe('parseCreateAdminArgs', () => {
  it('reads a phone and a name; the role defaults to owner', () => {
    expect(parseCreateAdminArgs(ok)).toEqual({ phone: '+919876543210', name: 'Owner One', role: 'owner' });
  });

  it('reads a role and an email', () => {
    expect(parseCreateAdminArgs([...ok, '--role', 'fulfillment_operator', '--email', 'a@b.co'])).toEqual({
      phone: '+919876543210', name: 'Owner One', role: 'fulfillment_operator', email: 'a@b.co',
    });
  });

  it.each([['9876543210'], ['+91 98765 43210'], ['+911234567890'], ['']])('refuses the phone %p', (phone) => {
    expect(() => parseCreateAdminArgs(['--phone', phone, '--name', 'Owner One'])).toThrow(/--phone/);
  });

  it('refuses a missing phone, name, or a one-letter name', () => {
    expect(() => parseCreateAdminArgs(['--name', 'Owner One'])).toThrow(/--phone/);
    expect(() => parseCreateAdminArgs(['--phone', '+919876543210'])).toThrow(/--name/);
    expect(() => parseCreateAdminArgs(['--phone', '+919876543210', '--name', 'O'])).toThrow(/--name/);
  });

  it('refuses an unknown role, listing the real ones', () => {
    expect(() => parseCreateAdminArgs([...ok, '--role', 'god'])).toThrow(/owner, catalog_editor, fulfillment_operator, support/);
  });

  it('refuses a badly written email', () => {
    expect(() => parseCreateAdminArgs([...ok, '--email', 'not-an-email'])).toThrow(/email/);
  });

  it('a flag without a value does not swallow the next flag', () => {
    expect(() => parseCreateAdminArgs(['--phone', '--name', 'Owner One'])).toThrow(/--phone/);
  });
});
