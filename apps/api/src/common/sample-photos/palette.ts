// Colours for the sample pictures: a colour NAME (as on a saree's colour, "Peacock Blue") becomes a fabric colour,
// and the second colour of a variant name ("Maroon & Gold") becomes the border and motif colour.

const NAMED: Record<string, string> = {
  maroon: '#7A1F35', 'deep maroon': '#6E2334', 'royal maroon': '#6A1B33', wine: '#5E1A33', red: '#B3202C', rust: '#A8461F',
  terracotta: '#C2603E', orange: '#E0762B', saffron: '#F28C1E', mustard: '#D9A521', turmeric: '#E0A41A', yellow: '#E6C23A',
  gold: '#C9A24A', 'natural gold': '#C9A24A', ivory: '#F3EBD8', cream: '#EFE3C8', beige: '#D8C3A0', white: '#F4F1EA',
  pink: '#D9608F', magenta: '#B0206F', coral: '#E8685A', purple: '#6E3B8F', violet: '#6A3FA0', lavender: '#A78BCB',
  navy: '#1B2A4E', indigo: '#2E3A87', blue: '#2F5DA8', sapphire: '#1D3F94', 'sky blue': '#5BA7D8', 'peacock blue': '#14607A',
  teal: '#1F7A7A', turquoise: '#2BB3B1', green: '#2E7D4F', 'forest green': '#2F5233', emerald: '#12795A', olive: '#6B7A2E',
  mint: '#7FD1AE', brown: '#6B4226', charcoal: '#3A3D44', grey: '#7A7D83', gray: '#7A7D83', black: '#1C1C1E', silver: '#C9CCD2',
};
// longest names first, so "peacock blue" is found before "blue"
const NAMES_LONGEST_FIRST = Object.keys(NAMED).sort((a, b) => b.length - a.length);

/** A small stable number for a text (the same text always gives the same number) */
export function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** The fabric colour for a colour name. A name that is not known still gets a fixed, pleasant colour of its own. */
export function colourHex(name: string | null | undefined): string {
  const text = (name ?? '').toLowerCase().trim();
  if (NAMED[text]) return NAMED[text];
  const found = NAMES_LONGEST_FIRST.find((key) => text.includes(key));
  if (found) return NAMED[found];
  return hslToHex(hashOf(text || 'saree') % 360, 0.55, 0.38);
}

export function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The colour mixed towards black (amount below 0) or white (above 0): -0.2 is 20% darker, 0.3 is 30% lighter */
export function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return (
    '#' +
    parseHex(hex)
      .map((c) => Math.round(c + (target - c) * t).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** 0 (dark) to 1 (light) */
export function lightness(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const DEFAULT_ACCENT = '#D4A537'; // zari gold

/**
 * The border and motif colour: the second colour in a variant name ("Maroon & Gold" gives gold), else zari gold.
 * On a light fabric a light accent would vanish, so a deep colour is used instead.
 */
export function accentFor(variantName: string | null | undefined, fabricHex: string): string {
  const second = (variantName ?? '').split('&')[1]?.trim().toLowerCase();
  const known = second && (NAMED[second] ?? NAMES_LONGEST_FIRST.map((key) => (second.includes(key) ? NAMED[key] : undefined)).find(Boolean));
  const accent = known || DEFAULT_ACCENT;
  if (lightness(fabricHex) > 0.6 && lightness(accent) > 0.6) return '#7A1F35';
  if (Math.abs(lightness(fabricHex) - lightness(accent)) < 0.12) return lightness(fabricHex) > 0.5 ? '#2E3A87' : DEFAULT_ACCENT;
  return accent;
}
