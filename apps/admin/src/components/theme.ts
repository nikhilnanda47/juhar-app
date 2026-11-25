// Light / dark for the admin panel. The choice is kept in this browser only.
// layout.tsx runs the same check before the page paints (so a dark page never flashes white first).

export type AdminTheme = 'light' | 'dark';
export const THEME_KEY = 'juhar_admin_theme';

/** The saved choice; light when nothing valid is saved or the browser blocks storage. */
export function readTheme(): AdminTheme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Show a theme on the page and remember it. */
export function applyTheme(theme: AdminTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked: the page still switches, it just will not be remembered */
  }
}
