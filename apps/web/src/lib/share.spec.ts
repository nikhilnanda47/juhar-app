import { productUrl, shareProduct } from './share';

const saree = { title: 'Two Colour Saree', slug: 'two-colour-saree' };
const abort = Object.assign(new Error('closed'), { name: 'AbortError' });

describe('productUrl', () => {
  it('is the website address plus the saree page', () => {
    expect(productUrl('https://juhar.co.in', 'two-colour-saree')).toBe('https://juhar.co.in/shop/two-colour-saree');
  });

  it('does not double a slash at the end of the address', () => {
    expect(productUrl('https://juhar.co.in/', 'x')).toBe('https://juhar.co.in/shop/x');
  });

  it('keeps an unusual page address safe', () => {
    expect(productUrl('https://juhar.co.in', 'a b/c')).toBe('https://juhar.co.in/shop/a%20b%2Fc');
  });
});

describe('shareProduct', () => {
  const origin = 'https://juhar.co.in';

  it("uses the browser's share sheet with the title, a line of text and the link", async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    const writeClipboard = jest.fn();
    const result = await shareProduct(saree, { origin, share, writeClipboard });
    expect(result).toEqual({ outcome: 'shared', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(share).toHaveBeenCalledWith({ title: 'Two Colour Saree', text: 'Two Colour Saree on Juhar', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('closing the share sheet is not a failure and copies nothing', async () => {
    const writeClipboard = jest.fn();
    const result = await shareProduct(saree, { origin, share: jest.fn().mockRejectedValue(abort), writeClipboard });
    expect(result.outcome).toBe('cancelled');
    expect(writeClipboard).not.toHaveBeenCalled();
  });

  it('copies the link when the browser has no share sheet', async () => {
    const writeClipboard = jest.fn().mockResolvedValue(undefined);
    const result = await shareProduct(saree, { origin, writeClipboard });
    expect(result).toEqual({ outcome: 'copied', url: 'https://juhar.co.in/shop/two-colour-saree' });
    expect(writeClipboard).toHaveBeenCalledWith('https://juhar.co.in/shop/two-colour-saree');
  });

  it('copies the link when the share sheet breaks for another reason', async () => {
    const writeClipboard = jest.fn().mockResolvedValue(undefined);
    const result = await shareProduct(saree, { origin, share: jest.fn().mockRejectedValue(new Error('NotAllowedError')), writeClipboard });
    expect(result.outcome).toBe('copied');
  });

  it('says it failed when nothing works (no share sheet, no clipboard, no page to copy in)', async () => {
    const result = await shareProduct(saree, { origin, writeClipboard: jest.fn().mockRejectedValue(new Error('blocked')) });
    expect(result.outcome).toBe('failed'); // document is not available in this test environment
    expect(result.url).toBe('https://juhar.co.in/shop/two-colour-saree'); // the link is still returned, so it can be shown to the customer
  });
});
