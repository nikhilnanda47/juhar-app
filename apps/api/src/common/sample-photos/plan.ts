// Which sample pictures a saree gets. Pure planning (no database, no drawing), so it can be tested on its own.
import { MEDIA } from '@juhar/shared';
import type { PlaceholderStyle } from './draw';

/** Every sample picture's description starts with this. It is how the pictures are told apart from real ones. */
export const SAMPLE_ALT_PREFIX = 'Sample picture';

export interface PlanVariant {
  id: string;
  color: string | null;
  name: string | null;
}

export interface PhotoSpec {
  style: PlaceholderStyle;
  colour: string;
  variantName: string | null;
  /** the colour this picture shows, or null for a saree with a single colour (it shows the whole saree) */
  variantId: string | null;
  altText: string;
  seed: string;
}

const STYLE_WORDS: Record<PlaceholderStyle, string> = {
  full: 'the saree laid flat',
  border: 'the border',
  ikat: 'the ikat weave',
  pallu: 'the pallu',
  weave: 'the cloth up close',
};

/** The details that follow the full views, in the order they appear in the gallery */
const DETAIL_STYLES: PlaceholderStyle[] = ['border', 'ikat', 'pallu', 'weave'];

/**
 * The pictures for one saree, in gallery order: first a full view of EACH colour (each tied to its colour, so choosing a
 * colour on the page shows it, and the first is the cover), then close-ups of the first colour. At most as many as a
 * product may have.
 */
export function planPhotos(productSlug: string, variants: PlanVariant[]): PhotoSpec[] {
  if (variants.length === 0) return [];
  const many = variants.length > 1;
  const describe = (v: PlanVariant, style: PlaceholderStyle): PhotoSpec => {
    const colour = v.color || v.name || 'Maroon';
    return {
      style,
      colour,
      variantName: v.name,
      variantId: many ? v.id : null,
      altText: `${SAMPLE_ALT_PREFIX}: ${colour.toLowerCase()}, ${STYLE_WORDS[style]}`,
      seed: `${productSlug}|${v.id}`,
    };
  };
  const specs = [
    ...variants.map((v) => describe(v, 'full')),
    ...DETAIL_STYLES.map((style) => describe(variants[0], style)),
  ];
  return specs.slice(0, MEDIA.MAX_PER_PRODUCT);
}

export interface SamplePhotoArgs {
  remove: boolean;
  /** only sarees whose address starts with this, such as "demo-" */
  prefix: string | null;
  /** at most this many sarees */
  limit: number | null;
}

export const SAMPLE_PHOTOS_USAGE =
  'Usage: npm run db:seed:photos -w apps/api -- [--prefix demo-] [--limit 20] [--remove]\n' +
  '  (nothing)   add sample pictures to every saree that has no photo yet\n' +
  '  --prefix    only sarees whose address starts with this, for example demo-\n' +
  '  --limit     only the first N sarees\n' +
  '  --remove    remove the sample pictures again (real photos are never touched)';

/** Reads the command line. Throws an Error whose message says what to fix. */
export function parseSamplePhotoArgs(argv: string[]): SamplePhotoArgs {
  const known = new Set(['--remove', '--prefix', '--limit']);
  const valueOf = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i < 0 ? undefined : argv[i + 1];
  };
  for (const arg of argv) {
    if (arg.startsWith('--') && !known.has(arg)) throw new Error(`Unknown option ${arg}.`);
  }
  const prefix = valueOf('--prefix');
  if (argv.includes('--prefix') && (!prefix || prefix.startsWith('--'))) throw new Error('--prefix needs a value, like --prefix demo-');
  const rawLimit = valueOf('--limit');
  let limit: number | null = null;
  if (argv.includes('--limit')) {
    limit = Number(rawLimit);
    if (!rawLimit || !Number.isInteger(limit) || limit < 1 || limit > 2000) throw new Error('--limit must be a whole number from 1 to 2000.');
  }
  return { remove: argv.includes('--remove'), prefix: prefix ?? null, limit };
}
