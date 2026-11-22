import { parseTrustProxy } from './trust-proxy';

describe('parseTrustProxy', () => {
  it.each([undefined, '', '   '])('does not trust proxies when unset (%p)', (raw) => {
    expect(parseTrustProxy(raw)).toBeUndefined();
  });

  it('reads a number of hops', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
  });

  it('reads true and false', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('passes other values (such as "loopback") on to Express', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
  });
});
