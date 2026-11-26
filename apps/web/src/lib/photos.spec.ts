import { firstPhotoIndexOfVariant, photoForVariant, stepPhoto, thumbnailForVariant } from './photos';

const photos = [
  { url: 'whole.webp', thumbnailUrl: 'whole-t.webp', variantId: null },
  { url: 'red.webp', thumbnailUrl: 'red-t.webp', variantId: 'red' },
  { url: 'red2.webp', thumbnailUrl: 'red2-t.webp', variantId: 'red' },
  { url: 'blue.webp', thumbnailUrl: null, variantId: 'blue' },
];

describe('photoForVariant', () => {
  it('prefers a photo of that colour, then one of the whole saree, then the first', () => {
    expect(photoForVariant(photos, 'red')?.url).toBe('red.webp'); // the first of the colour's own
    expect(photoForVariant(photos, 'green')?.url).toBe('whole.webp'); // none of its own: the whole-saree photo
    expect(photoForVariant(photos.slice(1), 'green')?.url).toBe('red.webp'); // nothing for it at all: anything beats a grey box
    expect(photoForVariant(photos, undefined)?.url).toBe('whole.webp');
  });

  it('is undefined when the saree has no photos', () => {
    expect(photoForVariant([], 'red')).toBeUndefined();
    expect(photoForVariant(undefined, 'red')).toBeUndefined();
    expect(photoForVariant(null, 'red')).toBeUndefined();
  });
});

describe('thumbnailForVariant', () => {
  it('gives the small copy, or the large one when there is no small one', () => {
    expect(thumbnailForVariant(photos, 'red')).toBe('red-t.webp');
    expect(thumbnailForVariant(photos, 'blue')).toBe('blue.webp');
    expect(thumbnailForVariant([], 'red')).toBeNull();
  });
});

describe('firstPhotoIndexOfVariant', () => {
  it('finds where the colour\'s own photos start, or -1', () => {
    expect(firstPhotoIndexOfVariant(photos, 'red')).toBe(1);
    expect(firstPhotoIndexOfVariant(photos, 'blue')).toBe(3);
    expect(firstPhotoIndexOfVariant(photos, 'green')).toBe(-1);
    expect(firstPhotoIndexOfVariant(photos, null)).toBe(-1);
    expect(firstPhotoIndexOfVariant([], 'red')).toBe(-1);
  });
});

describe('stepPhoto', () => {
  it('moves one photo and wraps round at both ends', () => {
    expect(stepPhoto(0, 4, 1)).toBe(1);
    expect(stepPhoto(3, 4, 1)).toBe(0);
    expect(stepPhoto(0, 4, -1)).toBe(3);
    expect(stepPhoto(2, 4, -1)).toBe(1);
    expect(stepPhoto(0, 1, 1)).toBe(0);
    expect(stepPhoto(5, 0, 1)).toBe(0);
  });
});
