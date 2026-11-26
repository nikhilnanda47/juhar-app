import { previewLine, productMetadata } from './product-metadata';

const saree = {
  title: 'Heritage Kumbha Silk – Deep Sapphire',
  shortDescription: 'Handwoven Kumbha silk with a temple border.',
  media: [
    { type: 'video', url: 'https://photos.test/clip.mp4' },
    { type: 'image', url: 'https://photos.test/products/1/a.webp', altText: 'Sapphire, laid flat', width: 1200, height: 1600 },
    { type: 'image', url: 'https://photos.test/products/1/b.webp' },
  ],
};

describe('productMetadata', () => {
  it('gives a pasted link a title, a line and the first photo', () => {
    const meta = productMetadata(saree);
    expect(meta.title).toBe('Heritage Kumbha Silk – Deep Sapphire — Juhar');
    expect(meta.description).toBe('Handwoven Kumbha silk with a temple border.');
    expect(meta.openGraph).toMatchObject({
      title: 'Heritage Kumbha Silk – Deep Sapphire — Juhar',
      images: [{ url: 'https://photos.test/products/1/a.webp', alt: 'Sapphire, laid flat', width: 1200, height: 1600 }],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: ['https://photos.test/products/1/a.webp'] });
  });

  it('skips non-photos, and uses the saree title as the description of the photo when it has none', () => {
    const meta = productMetadata({ ...saree, media: [{ type: 'image', url: 'https://photos.test/x.webp' }] });
    expect((meta.openGraph as any).images[0]).toEqual({ url: 'https://photos.test/x.webp', alt: saree.title });
  });

  it('is a plain card with no image when the saree has no photo yet', () => {
    const meta = productMetadata({ title: 'No photo yet', media: [] });
    expect((meta.openGraph as any).images).toBeUndefined();
    expect(meta.twitter).toMatchObject({ card: 'summary' });
  });

  it('falls back to a general title when the saree could not be loaded', () => {
    expect(productMetadata(null).title).toBe('Juhar — Sambalpuri Handloom Sarees');
    expect(productMetadata(undefined).openGraph).toBeUndefined();
  });
});

describe('previewLine', () => {
  it('prefers the short description, else the long one', () => {
    expect(previewLine({ title: 't', shortDescription: 'Short.', description: 'Long long.' })).toBe('Short.');
    expect(previewLine({ title: 't', description: 'Long long.' })).toBe('Long long.');
  });

  it('trims a long text at a word, with an ellipsis, within the limit', () => {
    const long = 'Handwoven '.repeat(40);
    const line = previewLine({ title: 't', description: long }, 100);
    expect(line.length).toBeLessThanOrEqual(100);
    expect(line.endsWith('…')).toBe(true);
    expect(line).not.toMatch(/Handwove…$/); // not cut in the middle of a word
  });

  it('collapses whitespace and has a general line when there is no text', () => {
    expect(previewLine({ title: 't', description: ' a\n\n  b ' })).toBe('a b');
    expect(previewLine({ title: 't' })).toContain('Sambalpuri');
  });
});
