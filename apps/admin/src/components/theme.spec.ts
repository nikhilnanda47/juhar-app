// The saved light/dark choice for the admin panel.
import { applyTheme, readTheme, THEME_KEY } from './theme';

function fakeBrowser(stored: Record<string, string> = {}, blocked = false) {
  const attrs: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (k: string) => { if (blocked) throw new Error('blocked'); return k in stored ? stored[k] : null; },
    setItem: (k: string, v: string) => { if (blocked) throw new Error('blocked'); stored[k] = v; },
  };
  (global as any).document = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } };
  return { stored, attrs };
}

describe('readTheme', () => {
  it('is light when nothing is saved', () => {
    fakeBrowser();
    expect(readTheme()).toBe('light');
  });

  it('is dark when dark was saved', () => {
    fakeBrowser({ [THEME_KEY]: 'dark' });
    expect(readTheme()).toBe('dark');
  });

  it('falls back to light for a value it does not know', () => {
    fakeBrowser({ [THEME_KEY]: 'purple' });
    expect(readTheme()).toBe('light');
  });

  it('falls back to light when the browser blocks storage', () => {
    fakeBrowser({}, true);
    expect(readTheme()).toBe('light');
  });
});

describe('applyTheme', () => {
  it('shows the theme on the page and remembers it', () => {
    const { stored, attrs } = fakeBrowser();
    applyTheme('dark');
    expect(attrs['data-theme']).toBe('dark');
    expect(stored[THEME_KEY]).toBe('dark');
    applyTheme('light');
    expect(attrs['data-theme']).toBe('light');
    expect(stored[THEME_KEY]).toBe('light');
  });

  it('still switches the page when storage is blocked', () => {
    const { attrs } = fakeBrowser({}, true);
    expect(() => applyTheme('dark')).not.toThrow();
    expect(attrs['data-theme']).toBe('dark');
  });
});
