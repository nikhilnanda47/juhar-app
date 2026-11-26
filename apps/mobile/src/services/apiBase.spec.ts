import { LOCAL_API, resolveApiBase } from './apiBase';

describe('resolveApiBase', () => {
  describe('development', () => {
    it('uses the API on this computer when nothing is set', () => {
      expect(resolveApiBase({ isDev: true })).toBe(LOCAL_API);
      expect(resolveApiBase({ isDev: true, envUrl: '' })).toBe(LOCAL_API);
      expect(resolveApiBase({ isDev: true, envUrl: '   ' })).toBe(LOCAL_API);
      expect(resolveApiBase({ isDev: true, envUrl: null })).toBe(LOCAL_API);
    });

    it('uses the address when one is set (the browser preview against the pilot, for example)', () => {
      expect(resolveApiBase({ isDev: true, envUrl: 'https://pilot-api.example.com' })).toBe('https://pilot-api.example.com');
    });

    it('allows plain http for development', () => {
      expect(resolveApiBase({ isDev: true, envUrl: 'http://192.168.1.20:3000' })).toBe('http://192.168.1.20:3000');
    });
  });

  describe('release build', () => {
    it('uses the address of the build', () => {
      expect(resolveApiBase({ isDev: false, envUrl: 'https://api.juhar.co.in' })).toBe('https://api.juhar.co.in');
    });

    it('drops a trailing slash, so paths are not doubled', () => {
      expect(resolveApiBase({ isDev: false, envUrl: 'https://api.juhar.co.in/' })).toBe('https://api.juhar.co.in');
      expect(resolveApiBase({ isDev: false, envUrl: 'https://api.juhar.co.in///' })).toBe('https://api.juhar.co.in');
    });

    it('refuses to start without an address, saying what to set', () => {
      expect(() => resolveApiBase({ isDev: false })).toThrow(/EXPO_PUBLIC_API_URL/);
      expect(() => resolveApiBase({ isDev: false, envUrl: '' })).toThrow(/no API address/);
    });

    it('refuses plain http', () => {
      expect(() => resolveApiBase({ isDev: false, envUrl: 'http://api.juhar.co.in' })).toThrow(/https/);
    });
  });

  describe('bad addresses, in any build', () => {
    it.each([
      ['https://api.juhar.in', 'the old placeholder'],
      ['https://REPLACE-WITH-PILOT-API-URL', 'a placeholder from the build profile'],
      ['https://replace-me.example.com', 'a placeholder, any capitals'],
    ])('refuses %s (%s)', (envUrl) => {
      expect(() => resolveApiBase({ isDev: false, envUrl })).toThrow(/placeholder/);
      expect(() => resolveApiBase({ isDev: true, envUrl })).toThrow(/placeholder/);
    });

    it('refuses text that is not an address', () => {
      expect(() => resolveApiBase({ isDev: true, envUrl: 'api.juhar.co.in' })).toThrow(/not a web address/);
      expect(() => resolveApiBase({ isDev: true, envUrl: 'not a url' })).toThrow(/not a web address/);
    });

    it('refuses other kinds of address', () => {
      expect(() => resolveApiBase({ isDev: true, envUrl: 'ftp://example.com' })).toThrow(/must start with https/);
    });
  });
});
