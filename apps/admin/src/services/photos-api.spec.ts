// The admin's photo calls: an upload is sent as a form (no JSON type, or the server cannot read the file), and the
// others as JSON, all with the admin's token.
import { ApiClient, ApiError } from './api';

const BASE = 'http://localhost:3000';
const PRODUCT = '11111111-1111-4111-8111-111111111111';
const PHOTO = '22222222-2222-4222-8222-222222222222';

let sent: { url: string; init: RequestInit }[] = [];
const answer = (data: unknown = []) => {
  (global as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
    sent.push({ url: String(url).replace(BASE, ''), init });
    return { status: 200, json: async () => ({ success: true, data }) };
  });
};
const header = (name: string) => (sent[0].init.headers as Record<string, string>)[name];

beforeEach(() => {
  sent = [];
  (global as any).window = {};
  (global as any).localStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
});
const signedIn = () => { const client = new ApiClient(); client.setToken('TOKEN'); return client; };

describe('uploading a photo', () => {
  it('sends the file as a form, with the token and without a JSON content type', async () => {
    answer([{ id: PHOTO }]);
    const file = new File([new Uint8Array([1, 2, 3])], 'saree.jpg', { type: 'image/jpeg' });
    const result = await signedIn().uploadPhoto(PRODUCT, file, { altText: 'Sapphire', variantId: PHOTO });

    expect(result).toEqual([{ id: PHOTO }]);
    expect(sent[0].url).toBe(`/api/v1/admin/products/${PRODUCT}/media`);
    expect(sent[0].init.method).toBe('POST');
    expect(header('Content-Type')).toBeUndefined(); // the browser adds multipart/form-data with its boundary
    expect(header('Authorization')).toBe('Bearer TOKEN');
    const form = sent[0].init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get('file') as File).name).toBe('saree.jpg');
    expect(form.get('altText')).toBe('Sapphire');
    expect(form.get('variantId')).toBe(PHOTO);
  });

  it('leaves out details that were not given', async () => {
    answer();
    await signedIn().uploadPhoto(PRODUCT, new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    const form = sent[0].init.body as FormData;
    expect(form.has('altText')).toBe(false);
    expect(form.has('variantId')).toBe(false);
  });

  it('shows the server\'s refusal as an error with its message', async () => {
    (global as any).fetch = jest.fn(async () => ({
      status: 400,
      json: async () => ({ success: false, error: { code: 'PHOTO_TOO_SMALL', message: 'That photo is too small and would look blurry.' } }),
    }));
    const error = await signedIn().uploadPhoto(PRODUCT, new File(['x'], 'a.jpg', { type: 'image/jpeg' })).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('That photo is too small and would look blurry.');
    expect(error.code).toBe('PHOTO_TOO_SMALL');
  });
});

describe('the other photo calls', () => {
  it('changes a description or colour with a JSON body', async () => {
    answer();
    await signedIn().updatePhoto(PRODUCT, PHOTO, { altText: null, variantId: PHOTO });
    expect(sent[0].url).toBe(`/api/v1/admin/products/${PRODUCT}/media/${PHOTO}`);
    expect(sent[0].init.method).toBe('PATCH');
    expect(header('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ altText: null, variantId: PHOTO });
  });

  it('puts the photos in a new order', async () => {
    answer();
    await signedIn().reorderPhotos(PRODUCT, ['b', 'a']);
    expect(sent[0].url).toBe(`/api/v1/admin/products/${PRODUCT}/media/order`);
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ ids: ['b', 'a'] });
  });

  it('removes a photo', async () => {
    answer();
    await signedIn().removePhoto(PRODUCT, PHOTO);
    expect(sent[0].url).toBe(`/api/v1/admin/products/${PRODUCT}/media/${PHOTO}`);
    expect(sent[0].init.method).toBe('DELETE');
  });
});
