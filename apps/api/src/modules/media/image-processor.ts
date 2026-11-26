// Turns whatever the admin picked into what the shop keeps: a large copy for the product page and a small one for
// cards and lists, both WebP. The pixels are what is checked, not the file name or the type the browser claimed.
// Re-encoding also drops everything hidden in the original (camera model, GPS position of the loom or the home).
import sharp, { type Metadata } from 'sharp';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { MEDIA } from '@juhar/shared';

const FULL = { width: 1600, height: 1600, quality: 82 };
const THUMB = { width: 600, height: 800, quality: 78 };
/** A decompression bomb is a tiny file that expands to a huge picture; nothing a phone takes comes near this. */
const MAX_INPUT_PIXELS = 80_000_000;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > MEDIA.MAX_FILE_BYTES) throw new PayloadTooLargeException('PHOTO_TOO_LARGE');

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new BadRequestException('PHOTO_NOT_AN_IMAGE');
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format) || !meta.width || !meta.height) {
    throw new BadRequestException('PHOTO_NOT_AN_IMAGE');
  }
  // (a 90 degree EXIF turn swaps width and height, which leaves the shorter side the same)
  const shortSide = Math.min(meta.width, meta.height);
  if (shortSide < MEDIA.MIN_SIDE_PX) throw new BadRequestException('PHOTO_TOO_SMALL');

  try {
    const pipeline = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate(); // rotate() applies the EXIF turn
    const [fullOut, thumbOut] = await Promise.all([
      pipeline()
        .resize({ width: FULL.width, height: FULL.height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: FULL.quality })
        .toBuffer({ resolveWithObject: true }),
      pipeline()
        .resize({ width: THUMB.width, height: THUMB.height, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: THUMB.quality })
        .toBuffer(),
    ]);
    return { full: fullOut.data, thumb: thumbOut, width: fullOut.info.width, height: fullOut.info.height };
  } catch {
    // the header looked like a picture but the pixels would not decode
    throw new BadRequestException('PHOTO_NOT_AN_IMAGE');
  }
}
