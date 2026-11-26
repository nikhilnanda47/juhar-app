import { DEFAULT_WEB_URL, productShareUrl, resolveWebBase, shareProduct } from './share';

const saree = { title: 'Two Colour Saree', slug: 'two-colour-saree' };
const base = 'https://juhar.co.in';

describe('resolveWebBase', () => {
  it('uses the public address when nothing is set', () => {
    expect(resolveWebBase(undefined)).toBe(DEFAULT_WEB_URL);
    expect(resolveWebBase('')).toBe(DEFAULT_WEB_URL);
    expect(resolveWebBase('  ')).toBe(DEFAULT_WEB_URL);
    expect(resolveWebBase(null)).toBe(DEFAULT_WEB_URL);
  });

  it('uses the address of the build, without a slash at the end', () => {
    expect(resolveWebBase('https://shop.example.com/')).toBe('https://shop.example.com');
  });

  it.each([['juhar.co.in', /not a web address/], ['ftp://x.com', /must start with https/], ['https://REPLACE-WITH-SITE', /placeholder/]])(
    'refuses %s',
    (value, message) => {
      expect(() => resolveWebBase(value)).toThrow(message);
    },
  );
});

describe('productShareUrl', () => {
  it('is the website plus the saree page', () => {
    expect(productShareUrl('two-colour-saree', base)).toBe('https://juhar.co.in/shop/two-colour-saree');
    expect(productShareUrl('x')).toBe('https://juhar.co.in/shop/x');
  });

  it('keeps an unusual page address safe', () => {
    expect(productShareUrl('a b/c', base)).toBe('https://juhar.co.in/shop/a%20b%2Fc');
  });
});

describe('shareProduct', () => {
  it("opens the phone's share sheet with the title and the link", async () => {
    const share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
    const copy = jest.fn();
    const result = await shareProduct(saree, { share, copy, webBase: base });
    expect(result).toEqual({ outcome: 'shared', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(share).toHaveBeenCalledWith({
      title: 'Two Colour Saree',
      message: 'Two Colour Saree on Juhar\nhttps://juhar.co.in/shop/two-colour-saree',
      url: 'https://juhar.co.in/shop/two-colour-saree',
    });
    expect(copy).not.toHaveBeenCalled();
  });

  it('closing the sheet on iOS is not a failure', async () => {
    const result = await shareProduct(saree, { share: jest.fn().mockResolvedValue({ action: 'dismissedAction' }), copy: jest.fn(), webBase: base });
    expect(result.outcome).toBe('cancelled');
  });

  it('copies the link when there is no share sheet', async () => {
    const copy = jest.fn().mockResolvedValue(undefined);
    const result = await shareProduct(saree, { share: jest.fn().mockRejectedValue(new Error('not supported')), copy, webBase: base });
    expect(result).toEqual({ outcome: 'copied', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(copy).toHaveBeenCalledWith('https://juhar.co.in/shop/two-colour-saree');
  });

  it('says it failed when nothing works, still returning the link to show', async () => {
    const result = await shareProduct(saree, { share: jest.fn().mockRejectedValue(new Error('x')), copy: jest.fn().mockRejectedValue(new Error('y')), webBase: base });
    expect(result).toEqual({ outcome: 'failed', url: 'https://juhar.co.in/shop/two-colour-saree' });
  });

  it('uses the website address of the build', async () => {
    const share = jest.fn().mockResolvedValue({ action: 'sharedAction' });
    const result = await shareProduct(saree, { share, copy: jest.fn(), webBase: 'https://shop.example.com' });
    expect(result.url).toBe('https://shop.example.com/shop/two-colour-saree');
  });
});
