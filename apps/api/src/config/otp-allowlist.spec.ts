import { parseAllowedPhones } from './otp-allowlist';

describe('parseAllowedPhones', () => {
  it('is empty when unset, blank or not text', () => {
    expect(parseAllowedPhones(undefined)).toEqual([]);
    expect(parseAllowedPhones('')).toEqual([]);
    expect(parseAllowedPhones('  ')).toEqual([]);
    expect(parseAllowedPhones(123)).toEqual([]);
  });

  it('reads numbers separated by commas, semicolons or new lines, and drops repeats', () => {
    expect(parseAllowedPhones('+919876543210, +919123456789;+919876543210\n+918765432109'))
      .toEqual(['+919876543210', '+919123456789', '+918765432109']);
  });

  it.each(['9876543210', '+91 98765 43210', '+911234567890', '+9198765', '98765abcde', '+441234567890'])(
    'refuses %p, naming it',
    (bad) => {
      expect(() => parseAllowedPhones(`+919876543210,${bad}`)).toThrow(`"${bad}"`);
    },
  );

  it('says "numbers" when more than one is wrong', () => {
    expect(() => parseAllowedPhones('123,456')).toThrow(/has numbers that are not written/);
  });

  it('a number with spaces inside is one wrong entry, shown as typed (not split into pieces)', () => {
    expect(() => parseAllowedPhones('+91 98765 43210')).toThrow('"+91 98765 43210"');
  });
});
