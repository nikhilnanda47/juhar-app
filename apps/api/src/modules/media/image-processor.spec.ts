import sharp from 'sharp';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MEDIA } from '@juhar/shared';
import { processImage } from './image-processor';

/** A plain picture of the given size, as the given format */
const picture = (width: number, height: number, format: 'jpeg' | 'png' | 'webp' | 'gif' = 'jpeg', extra?: (s: sharp.Sharp) => sharp.Sharp) => {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 139, g: 58, b: 74 } } });
  const shaped = extra ? extra(base) : base;
  return shaped.toFormat(format).toBuffer();
};

const codeOf = async (promise: Promise<unknown>) => {
  try { await promise; } catch (e: any) { return { code: e.message as string, status: e.getStatus?.() }; }
  throw new Error('expected a refusal');
};

describe('processImage', () => {
  it('shrinks a large photo to 1600 pixels and makes a small copy, both WebP', async () => {
    const out = await processImage(await picture(4000, 3000));
    const full = await sharp(out.full).metadata();
    const thumb = await sharp(out.thumb).metadata();
    expect(full.format).toBe('webp');
    expect(thumb.format).toBe('webp');
    expect(Math.max(full.width!, full.height!)).toBe(1600);
    expect(full.width! / full.height!).toBeCloseTo(4 / 3, 1); // the shape is kept
    expect(thumb.width!).toBeLessThanOrEqual(600);
    expect(thumb.height!).toBeLessThanOrEqual(800);
    expect(out.thumb.length).toBeLessThan(out.full.length);
    expect({ width: out.width, height: out.height }).toEqual({ width: full.width, height: full.height });
  });

  it('does not enlarge a photo that is already smaller than the limit', async () => {
    const out = await processImage(await picture(900, 1200));
    expect(await sharp(out.full).metadata()).toMatchObject({ width: 900, height: 1200 });
  });

  it.each(['jpeg', 'png', 'webp'] as const)('accepts %s', async (format) => {
    const out = await processImage(await picture(800, 1000, format));
    expect((await sharp(out.full).metadata()).format).toBe('webp');
  });

  it('turns a phone photo the right way up and reports the shape it ends up with', async () => {
    // a landscape picture marked "rotate 90 degrees": a phone held upright
    const phone = await picture(1200, 800, 'jpeg', (s) => s.withMetadata({ orientation: 6 }));
    const out = await processImage(phone);
    expect({ width: out.width, height: out.height }).toEqual({ width: 800, height: 1200 });
  });

  it('keeps nothing hidden in the original (camera details, location)', async () => {
    const tagged = await picture(1000, 1000, 'jpeg', (s) => s.withMetadata({ exif: { IFD0: { Copyright: 'someone', Make: 'a camera' } } }));
    expect((await sharp(tagged).metadata()).exif).toBeDefined(); // the test picture really carries it
    const out = await processImage(tagged);
    expect((await sharp(out.full).metadata()).exif).toBeUndefined();
    expect((await sharp(out.thumb).metadata()).exif).toBeUndefined();
  });

  it('refuses a file that is not a picture, whatever it is called', async () => {
    expect(await codeOf(processImage(Buffer.from('this is a text file, not a photo')))).toEqual({ code: 'PHOTO_NOT_AN_IMAGE', status: 400 });
    expect(await codeOf(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')))).toMatchObject({ code: 'PHOTO_NOT_AN_IMAGE' });
  });

  it('refuses picture types we do not keep (GIF)', async () => {
    expect(await codeOf(processImage(await picture(800, 800, 'gif')))).toMatchObject({ code: 'PHOTO_NOT_AN_IMAGE' });
  });

  it('refuses a damaged picture', async () => {
    const good = await picture(800, 800);
    const cut = good.subarray(0, 200); // a header with no picture behind it
    expect(await codeOf(processImage(cut))).toMatchObject({ code: 'PHOTO_NOT_AN_IMAGE' });
  });

  it('refuses a photo that is too small, by its shorter side', async () => {
    expect(await codeOf(processImage(await picture(300, 300)))).toEqual({ code: 'PHOTO_TOO_SMALL', status: 400 });
    expect(await codeOf(processImage(await picture(3000, MEDIA.MIN_SIDE_PX - 1)))).toMatchObject({ code: 'PHOTO_TOO_SMALL' });
    await expect(processImage(await picture(3000, MEDIA.MIN_SIDE_PX))).resolves.toBeDefined(); // exactly the minimum is fine
  });

  it('refuses a file over the size limit before looking at it', async () => {
    const huge = Buffer.alloc(MEDIA.MAX_FILE_BYTES + 1);
    const error = await processImage(huge).catch((e) => e);
    expect(error).toBeInstanceOf(PayloadTooLargeException);
    expect(error.message).toBe('PHOTO_TOO_LARGE');
  });

  it('is a BadRequest (400) for the customer-facing refusals', async () => {
    const error = await processImage(Buffer.from('nope')).catch((e) => e);
    expect(error).toBeInstanceOf(BadRequestException);
  });
});
