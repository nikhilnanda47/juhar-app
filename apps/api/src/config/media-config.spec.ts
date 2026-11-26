import { mediaConfigProblems, resolveMediaConfig } from './media-config';

const R2 = {
  R2_ACCOUNT_ID: 'acc', R2_ACCESS_KEY_ID: 'key', R2_SECRET_ACCESS_KEY: 'secret', R2_BUCKET: 'juhar-photos',
  MEDIA_PUBLIC_URL: 'https://photos.juhar.co.in/',
};

describe('resolveMediaConfig', () => {
  it('uses R2 when everything is set, without a trailing slash on the public address', () => {
    expect(resolveMediaConfig({ ...R2, NODE_ENV: 'production' })).toEqual({
      kind: 'r2', accountId: 'acc', accessKeyId: 'key', secretAccessKey: 'secret', bucket: 'juhar-photos',
      publicUrl: 'https://photos.juhar.co.in',
    });
  });

  it('uses a folder on this computer in development, served by the API itself', () => {
    const config = resolveMediaConfig({ NODE_ENV: 'development', PORT: '3000' });
    expect(config.kind).toBe('local');
    expect(config.publicUrl).toBe('http://localhost:3000/media');
    expect((config as { dir: string }).dir).toMatch(/uploads$/);
  });

  it('takes the folder and the public address from the settings', () => {
    expect(resolveMediaConfig({ UPLOAD_DIR: '/data/photos', MEDIA_PUBLIC_URL: 'http://192.168.1.5:3000/media/' })).toEqual({
      kind: 'local', dir: '/data/photos', publicUrl: 'http://192.168.1.5:3000/media',
    });
  });

  it('keeps no photos on a live API with nothing set (its disk is wiped on every deploy)', () => {
    expect(resolveMediaConfig({ NODE_ENV: 'production' }).kind).toBe('none');
  });

  it('falls back to a local folder when only part of R2 is set outside production (the start is stopped separately)', () => {
    expect(resolveMediaConfig({ R2_BUCKET: 'x' }).kind).toBe('local');
  });
});

describe('mediaConfigProblems', () => {
  it('has nothing to say when no photo storage is set, or all of it is', () => {
    expect(mediaConfigProblems({})).toEqual([]);
    expect(mediaConfigProblems({ NODE_ENV: 'production' })).toEqual([]);
    expect(mediaConfigProblems({ ...R2, NODE_ENV: 'production' })).toEqual([]);
  });

  it('names what is missing when R2 is only partly set', () => {
    const [problem] = mediaConfigProblems({ R2_ACCOUNT_ID: 'acc', R2_BUCKET: 'b' });
    expect(problem).toContain('only partly set');
    expect(problem).toContain('R2_ACCESS_KEY_ID');
    expect(problem).toContain('R2_SECRET_ACCESS_KEY');
    expect(problem).toContain('MEDIA_PUBLIC_URL');
    expect(problem).not.toContain('R2_BUCKET,');
  });

  it('wants a real web address, https on a live API', () => {
    expect(mediaConfigProblems({ ...R2, MEDIA_PUBLIC_URL: 'photos' })[0]).toContain('web address');
    expect(mediaConfigProblems({ ...R2, MEDIA_PUBLIC_URL: 'http://photos.example.com', NODE_ENV: 'production' })[0]).toContain('https://');
    expect(mediaConfigProblems({ ...R2, MEDIA_PUBLIC_URL: 'http://localhost:9000/photos' })).toEqual([]);
  });
});
