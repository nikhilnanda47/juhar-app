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
  const ok = { action: 'sharedAction' };

  it("on Android the share sheet gets the title and the link as the message, and nothing else", async () => {
    const share = jest.fn().mockResolvedValue(ok);
    const copy = jest.fn();
    const result = await shareProduct(saree, { share, copy, webBase: base, platform: 'android' });
    expect(result).toEqual({ outcome: 'shared', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(share).toHaveBeenCalledWith({ title: 'Two Colour Saree', message: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(copy).not.toHaveBeenCalled();
  });

  it('on iOS the link goes as the link, not also as a message (it would be pasted twice)', async () => {
    const share = jest.fn().mockResolvedValue(ok);
    await shareProduct(saree, { share, copy: jest.fn(), webBase: base, platform: 'ios' });
    expect(share).toHaveBeenCalledWith({ title: 'Two Colour Saree', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(share.mock.calls[0][0]).not.toHaveProperty('message');
  });

  it.each(['android', 'ios', 'web'])('on %s nothing but the title and the link is handed over, and the link only once', async (platform) => {
    const share = jest.fn().mockResolvedValue(ok);
    await shareProduct(saree, { share, copy: jest.fn(), webBase: base, platform });
    const content = share.mock.calls[0][0];
    const everything = JSON.stringify({ ...content, title: undefined });
    expect(everything.split('https://juhar.co.in/shop/two-colour-saree')).toHaveLength(2); // exactly one copy of the link
    expect(everything).not.toContain('on Juhar');
  });

  it('closing the sheet on iOS is not a failure', async () => {
    const result = await shareProduct(saree, { share: jest.fn().mockResolvedValue({ action: 'dismissedAction' }), copy: jest.fn(), webBase: base, platform: 'ios' });
    expect(result.outcome).toBe('cancelled');
  });

  it('copies the link when there is no share sheet', async () => {
    const copy = jest.fn().mockResolvedValue(undefined);
    const result = await shareProduct(saree, { share: jest.fn().mockRejectedValue(new Error('not supported')), copy, webBase: base, platform: 'web' });
    expect(result).toEqual({ outcome: 'copied', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(copy).toHaveBeenCalledWith('https://juhar.co.in/shop/two-colour-saree');
  });

  it('says it failed when nothing works, still returning the link to show', async () => {
    const result = await shareProduct(saree, { share: jest.fn().mockRejectedValue(new Error('x')), copy: jest.fn().mockRejectedValue(new Error('y')), webBase: base, platform: 'web' });
    expect(result).toEqual({ outcome: 'failed', url: 'https://juhar.co.in/shop/two-colour-saree' });
  });

  it('uses the website address of the build', async () => {
    const share = jest.fn().mockResolvedValue(ok);
    const result = await shareProduct(saree, { share, copy: jest.fn(), webBase: 'https://shop.example.com', platform: 'android' });
    expect(result.url).toBe('https://shop.example.com/shop/two-colour-saree');
  });
});
