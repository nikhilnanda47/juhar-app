// Draws the sample pictures: Sambalpuri-style fabric views (woven body, temple-border zigzag, ikat diamonds, pallu
// stripes) as SVG, then renders them to a JPEG with sharp. They are obviously drawings, not photographs, and each says
// SAMPLE PICTURE in a corner so nobody mistakes one for the real saree.
import sharp from 'sharp';
import { accentFor, colourHex, hashOf, shade } from './palette';

export type PlaceholderStyle = 'full' | 'border' | 'ikat' | 'pallu' | 'weave';

export interface PlaceholderInput {
  style: PlaceholderStyle;
  /** colour name of the saree, like "Peacock Blue" */
  colour: string;
  /** the variant's name, whose second colour ("Maroon & Gold") is the border colour */
  variantName?: string | null;
  /** a text that makes this picture's small variations (the same seed always draws the same picture) */
  seed: string;
}

export const WIDTH = 1200;
export const HEIGHT = 1600;

/** A small repeatable random number generator, so a seed always draws the same picture */
function random(seed: string) {
  let a = hashOf(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rect = (x: number, y: number, w: number, h: number, fill: string, opacity = 1) =>
  `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`;

/** A row of temple-border zigzag triangles across the picture */
function zigzag(y: number, h: number, tooth: number, fill: string): string {
  let d = '';
  for (let x = -tooth; x < WIDTH + tooth; x += tooth * 2) {
    d += `M${x} ${y + h}L${x + tooth} ${y}L${x + tooth * 2} ${y + h}Z`;
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

/**
 * An ikat diamond as path data: stepped edges made of small rectangles, like the blurred-edge look of tie-dyed thread.
 * (Path data, not one element per rectangle: a whole grid of these is a single shape, which draws much faster.)
 */
function ikatDiamond(cx: number, cy: number, radius: number, step: number): string {
  let d = '';
  for (let dy = -radius; dy <= radius; dy += step) {
    const half = radius - Math.abs(dy);
    d += `M${(cx - half).toFixed(1)} ${(cy + dy).toFixed(1)}h${(half * 2).toFixed(1)}v${step.toFixed(1)}h${(-half * 2).toFixed(1)}z`;
  }
  return d;
}

/** Fine threads: vertical and horizontal lines, so the cloth reads as woven */
function threads(base: string, strength = 0.07): string {
  const dark = shade(base, -0.5);
  const light = shade(base, 0.5);
  return (
    `<defs><pattern id="warp" width="7" height="7" patternUnits="userSpaceOnUse">` +
    `<rect width="3" height="7" fill="${dark}" opacity="${strength}"/><rect x="4" width="1.5" height="7" fill="${light}" opacity="${strength}"/></pattern>` +
    `<pattern id="weft" width="7" height="7" patternUnits="userSpaceOnUse">` +
    `<rect width="7" height="2" fill="${dark}" opacity="${strength * 0.6}"/></pattern></defs>` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#warp)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#weft)"/>`
  );
}

/** Motifs in a staggered grid over a region */
function motifGrid(x0: number, y0: number, x1: number, y1: number, size: number, fill: string, rnd: () => number, opacity = 0.75): string {
  let d = '';
  const gap = size * 2.6;
  let row = 0;
  for (let y = y0 + size; y < y1 - size / 2; y += gap * 0.8, row++) {
    for (let x = x0 + size + (row % 2 ? gap / 2 : 0); x < x1; x += gap) {
      const r = size * (0.85 + rnd() * 0.3);
      d += ikatDiamond(x, y, r, Math.max(4, r / 7));
    }
  }
  return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
}

function banner(): string {
  // the sample label: a white pill with text in a plain font
  return (
    `<rect x="${WIDTH - 420}" y="${HEIGHT - 110}" width="390" height="70" rx="35" fill="#ffffff" opacity="0.88"/>` +
    `<text x="${WIDTH - 225}" y="${HEIGHT - 64}" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="3" fill="#444">SAMPLE PICTURE</text>`
  );
}

export function placeholderSvg(input: PlaceholderInput): string {
  const fabric = colourHex(input.colour);
  const accent = accentFor(input.variantName, fabric);
  const deep = shade(fabric, -0.3);
  const rnd = random(`${input.seed}|${input.style}|${input.colour}`);
  let body = '';

  switch (input.style) {
    case 'full': {
      // the whole saree laid flat: body, a top border, a wide pallu at the bottom
      body += rect(0, 0, WIDTH, HEIGHT, fabric);
      body += threads(fabric);
      body += motifGrid(0, 230, WIDTH, 1130, 26, accent, rnd, 0.7);
      body += rect(0, 0, WIDTH, 190, deep) + rect(0, 190, WIDTH, 14, accent) + rect(0, 214, WIDTH, 6, shade(accent, 0.3));
      body += zigzag(70, 90, 45, accent) + rect(0, 40, WIDTH, 10, accent, 0.9);
      body += rect(0, 1130, WIDTH, 470, deep) + rect(0, 1130, WIDTH, 16, accent) + rect(0, 1170, WIDTH, 6, shade(accent, 0.3));
      body += motifGrid(0, 1190, WIDTH, 1440, 38, accent, rnd, 0.9);
      body += rect(0, 1470, WIDTH, 10, accent) + rect(0, 1500, WIDTH, 40, shade(deep, -0.2)) + zigzag(1548, 40, 30, accent);
      break;
    }
    case 'border': {
      // a close view of the border: wide bands of zigzag and stripes
      body += rect(0, 0, WIDTH, HEIGHT, deep);
      body += threads(deep);
      for (let i = 0; i < 5; i++) {
        const y = 80 + i * 300;
        body += rect(0, y, WIDTH, 190, i % 2 ? fabric : shade(deep, -0.15));
        body += rect(0, y + 12, WIDTH, 8, accent) + rect(0, y + 170, WIDTH, 8, accent);
        body += zigzag(y + 40, 110, 36 + (i % 2) * 12, accent);
        body += rect(0, y + 200, WIDTH, 5, shade(accent, 0.25), 0.8);
      }
      break;
    }
    case 'ikat': {
      // a close view of the ikat: large stepped diamonds with a feathered look
      body += rect(0, 0, WIDTH, HEIGHT, fabric);
      body += threads(fabric, 0.1);
      body += motifGrid(0, 0, WIDTH, HEIGHT, 70, accent, rnd, 0.82);
      body += motifGrid(40, 60, WIDTH, HEIGHT, 34, shade(fabric, -0.35), rnd, 0.55);
      break;
    }
    case 'pallu': {
      // the end piece: stripes, a band of arches and big motifs
      body += rect(0, 0, WIDTH, HEIGHT, deep);
      body += threads(deep);
      body += rect(0, 60, WIDTH, 140, accent, 0.95) + rect(0, 220, WIDTH, 30, fabric) + rect(0, 270, WIDTH, 14, accent);
      let arches = '';
      for (let x = 0; x < WIDTH; x += 150) arches += `<path d="M${x + 10} 760V560a65 65 0 0 1 130 0V760Z" fill="${accent}" opacity="0.85"/>`;
      body += arches + rect(0, 780, WIDTH, 16, accent);
      body += motifGrid(0, 830, WIDTH, 1350, 52, accent, rnd, 0.9);
      body += rect(0, 1370, WIDTH, 14, accent) + rect(0, 1410, WIDTH, 120, shade(accent, -0.1), 0.95) + zigzag(1530, 60, 40, shade(deep, -0.25));
      break;
    }
    case 'weave': {
      // the cloth up close: thick threads in two tones
      body += rect(0, 0, WIDTH, HEIGHT, fabric);
      for (let x = 0; x < WIDTH; x += 20) body += rect(x, 0, 11 + rnd() * 4, HEIGHT, rnd() > 0.5 ? shade(fabric, -0.18) : shade(fabric, 0.12), 0.8);
      for (let y = 0; y < HEIGHT; y += 22) body += rect(0, y, WIDTH, 5 + rnd() * 3, rnd() > 0.55 ? accent : shade(fabric, -0.3), rnd() > 0.55 ? 0.55 : 0.35);
      break;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${body}${banner()}</svg>`;
}

/** The picture as a JPEG, 1200 x 1600 (3:4, the shape of the shop's photos) */
export async function renderPlaceholder(input: PlaceholderInput): Promise<Buffer> {
  return sharp(Buffer.from(placeholderSvg(input)), { density: 72 }).resize(WIDTH, HEIGHT).jpeg({ quality: 88 }).toBuffer();
}
