import sharp from 'sharp';
import { MEDIA } from '@juhar/shared';
import { processImage } from '../../modules/media/image-processor';
import { accentFor, colourHex, hashOf, lightness, shade } from './palette';
import { HEIGHT, placeholderSvg, renderPlaceholder, WIDTH, type PlaceholderStyle } from './draw';
import { parseSamplePhotoArgs, planPhotos, SAMPLE_ALT_PREFIX } from './plan';

jest.setTimeout(30_000); // drawing and encoding a 1200 x 1600 picture takes a moment on a slow machine

describe('colours', () => {
  it('knows the colour names sarees use, in any letter case', () => {
    expect(colourHex('Maroon')).toBe('#7A1F35');
    expect(colourHex('maroon')).toBe(colourHex('MAROON'));
    expect(colourHex('Peacock Blue')).toBe('#14607A'); // the whole name wins over "blue"
    expect(colourHex('Forest Green')).toBe('#2F5233');
    expect(colourHex('Deep Maroon')).toBe('#6E2334');
  });

  it('finds a known colour inside a longer name', () => {
    expect(colourHex('Pale Sky Blue silk')).toBe(colourHex('sky blue'));
    expect(colourHex('Royal Bridal Red')).toBe(colourHex('red'));
  });

  it('gives an unknown colour a colour of its own, always the same one', () => {
    const a = colourHex('Moonlit Orchid');
    expect(a).toMatch(/^#[0-9a-f]{6}$/);
    expect(colourHex('Moonlit Orchid')).toBe(a);
    expect(colourHex('Sunlit Orchid')).not.toBe(a);
    expect(colourHex(null)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('makes a colour darker or lighter by a share', () => {
    expect(shade('#808080', -0.5)).toBe('#404040');
    expect(shade('#808080', 0.5)).toBe('#c0c0c0');
    expect(lightness('#000000')).toBe(0);
    expect(lightness('#ffffff')).toBeCloseTo(1, 5);
  });

  it('takes the border colour from the second colour in a variant name, else zari gold', () => {
    expect(accentFor('Maroon & Silver', colourHex('Maroon'))).toBe(colourHex('silver'));
    expect(accentFor('Maroon & Gold', colourHex('Maroon'))).toBe(colourHex('gold'));
    expect(accentFor('Natural Gold', colourHex('Gold'))).toMatch(/^#/); // no second colour: a default that is not lost on the cloth
    expect(accentFor('Deep Sapphire & Paisley', colourHex('Sapphire'))).toBe('#D4A537'); // "Paisley" is not a colour
  });

  it('never puts a light border on a light cloth, or a border that matches the cloth', () => {
    const ivory = colourHex('Ivory');
    expect(lightness(accentFor('Ivory & Gold', ivory))).toBeLessThan(0.6);
    const gold = colourHex('Gold');
    expect(accentFor('Gold & Gold', gold)).not.toBe(gold);
  });

  it('hashes a text to the same number every time', () => {
    expect(hashOf('abc')).toBe(hashOf('abc'));
    expect(hashOf('abc')).not.toBe(hashOf('abd'));
  });
});

describe('drawing', () => {
  const STYLES: PlaceholderStyle[] = ['full', 'border', 'ikat', 'pallu', 'weave'];

  it.each(STYLES)('draws the %s picture as a 1200 x 1600 JPEG', async (style) => {
    const jpeg = await renderPlaceholder({ style, colour: 'Maroon', variantName: 'Maroon & Gold', seed: 'demo-1' });
    const meta = await sharp(jpeg).metadata();
    expect(meta).toMatchObject({ format: 'jpeg', width: WIDTH, height: HEIGHT });
    expect(WIDTH / HEIGHT).toBeCloseTo(3 / 4);
  });

  it.each(STYLES)('the %s picture is accepted by the same checks a real upload goes through', async (style) => {
    const jpeg = await renderPlaceholder({ style, colour: 'Peacock Blue', variantName: 'Peacock Blue & Silver', seed: 's' });
    const processed = await processImage(jpeg); // the type, size and pixel checks of the admin upload
    expect(processed.width).toBeGreaterThanOrEqual(MEDIA.MIN_SIDE_PX);
    expect(jpeg.length).toBeLessThan(MEDIA.MAX_FILE_BYTES);
  });

  it('draws the same picture for the same input, and a different one when the colour, style or seed differ', async () => {
    const base = { style: 'full' as const, colour: 'Maroon', variantName: 'Maroon & Gold', seed: 'a' };
    const same = await Promise.all([renderPlaceholder(base), renderPlaceholder(base)]);
    expect(same[0].equals(same[1])).toBe(true);
    for (const other of [{ ...base, colour: 'Teal' }, { ...base, style: 'ikat' as const }, { ...base, seed: 'b', style: 'ikat' as const }]) {
      expect((await renderPlaceholder(other)).equals(same[0])).toBe(false);
    }
  });

  it('says SAMPLE PICTURE on every picture, so it is never taken for the real saree', () => {
    for (const style of STYLES) expect(placeholderSvg({ style, colour: 'Red', seed: 'x' })).toContain('SAMPLE PICTURE');
  });

  it('really is the colour asked for (the average colour of the cloth is close to it)', async () => {
    const { dominant } = await sharp(await renderPlaceholder({ style: 'weave', colour: 'Teal', variantName: 'Teal', seed: 't' })).stats();
    const [r, g, b] = [dominant.r, dominant.g, dominant.b];
    expect(g + b).toBeGreaterThan(r * 2); // a teal, not a red
  });
});

describe('planPhotos', () => {
  const v = (id: string, color: string, name = `${color} & Gold`) => ({ id, color, name });

  it('gives a one-colour saree a full view and four close-ups, none tied to a colour', () => {
    const specs = planPhotos('saree-1', [v('a', 'Maroon')]);
    expect(specs.map((s) => s.style)).toEqual(['full', 'border', 'ikat', 'pallu', 'weave']);
    expect(specs.every((s) => s.variantId === null)).toBe(true);
  });

  it('gives a saree with several colours a full view of EACH colour first (the first is the cover), tied to that colour, then close-ups of the first', () => {
    const specs = planPhotos('saree-2', [v('a', 'Maroon'), v('b', 'Teal'), v('c', 'Mustard')]);
    expect(specs.map((s) => `${s.style}:${s.colour}:${s.variantId}`)).toEqual([
      'full:Maroon:a', 'full:Teal:b', 'full:Mustard:c',
      'border:Maroon:a', 'ikat:Maroon:a', 'pallu:Maroon:a', 'weave:Maroon:a',
    ]);
  });

  it('never plans more than a saree may have', () => {
    const many = Array.from({ length: 9 }, (_, i) => v(`v${i}`, 'Red'));
    const specs = planPhotos('saree-3', many);
    expect(specs).toHaveLength(MEDIA.MAX_PER_PRODUCT);
    expect(specs.slice(0, 9).every((s) => s.style === 'full')).toBe(true); // every colour keeps its full view
  });

  it('plans nothing for a saree with no colours', () => {
    expect(planPhotos('saree-4', [])).toEqual([]);
  });

  it('describes every picture as a sample, for screen readers and so that --remove can find it', () => {
    for (const spec of planPhotos('saree-5', [v('a', 'Maroon'), v('b', 'Teal')])) {
      expect(spec.altText.startsWith(SAMPLE_ALT_PREFIX)).toBe(true);
      expect(spec.altText.length).toBeLessThanOrEqual(255);
    }
  });

  it('uses the colour name, falling back to the variant name, then a default, so nothing is drawn without a colour', () => {
    expect(planPhotos('s', [{ id: 'a', color: null, name: 'Olive Flora' }])[0].colour).toBe('Olive Flora');
    expect(planPhotos('s', [{ id: 'a', color: null, name: null }])[0].colour).toBe('Maroon');
  });

  it('is the same every time (same saree, same plan)', () => {
    expect(planPhotos('same', [v('a', 'Maroon')])).toEqual(planPhotos('same', [v('a', 'Maroon')]));
  });
});

describe('parseSamplePhotoArgs', () => {
  it('adds pictures to every saree by default', () => {
    expect(parseSamplePhotoArgs([])).toEqual({ remove: false, prefix: null, limit: null });
  });
  it('reads --prefix, --limit and --remove', () => {
    expect(parseSamplePhotoArgs(['--prefix', 'demo-', '--limit', '20'])).toEqual({ remove: false, prefix: 'demo-', limit: 20 });
    expect(parseSamplePhotoArgs(['--remove'])).toEqual({ remove: true, prefix: null, limit: null });
  });
  it('explains what is wrong', () => {
    expect(() => parseSamplePhotoArgs(['--prefix'])).toThrow('--prefix needs a value');
    expect(() => parseSamplePhotoArgs(['--limit', 'many'])).toThrow('--limit must be a whole number');
    expect(() => parseSamplePhotoArgs(['--limit', '0'])).toThrow('--limit must be a whole number');
    expect(() => parseSamplePhotoArgs(['--limit', '5000'])).toThrow('--limit must be a whole number');
    expect(() => parseSamplePhotoArgs(['--all'])).toThrow('Unknown option --all');
  });
});
