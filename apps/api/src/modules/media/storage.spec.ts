import { mkdtemp, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import { LocalStorage, NoStorage, PHOTO_CACHE_CONTROL, R2Storage, createStorage } from './storage';

describe('LocalStorage', () => {
  let dir: string;
  let storage: LocalStorage;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'juhar-storage-'));
    storage = new LocalStorage(dir, 'http://localhost:3000/media');
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('keeps a file under its key, creating the folders, and gives its public address', async () => {
    await storage.put('products/abc/one.webp', Buffer.from('bytes'));
    expect(await readFile(join(dir, 'products/abc/one.webp'), 'utf8')).toBe('bytes');
    expect(storage.urlFor('products/abc/one.webp')).toBe('http://localhost:3000/media/products/abc/one.webp');
  });

  it('removes files, and a file that is already gone is not an error', async () => {
    await storage.put('a/one.webp', Buffer.from('1'));
    await storage.delete(['a/one.webp', 'a/never-existed.webp']);
    await expect(stat(join(dir, 'a/one.webp'))).rejects.toThrow();
  });

  it('never reads or writes outside its own folder', async () => {
    await expect(storage.put('../escape.txt', Buffer.from('x'))).rejects.toThrow('Unsafe storage key');
    await expect(storage.put('products/../../escape.txt', Buffer.from('x'))).rejects.toThrow('Unsafe storage key');
    await expect(storage.delete(['../../etc/passwd'])).rejects.toThrow('Unsafe storage key');
  });
});

describe('R2Storage', () => {
  const fake = () => { const send = jest.fn().mockResolvedValue({}); return { send, storage: new R2Storage({ send } as any, 'juhar-photos', 'https://photos.juhar.co.in') }; };

  it('uploads with the right type and a one-year cache (a photo never changes under its name)', async () => {
    const { send, storage } = fake();
    await storage.put('products/x/1.webp', Buffer.from('bytes'), 'image/webp');
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({ Bucket: 'juhar-photos', Key: 'products/x/1.webp', ContentType: 'image/webp', CacheControl: PHOTO_CACHE_CONTROL });
    expect(PHOTO_CACHE_CONTROL).toContain('immutable');
  });

  it('deletes several files in one call, and does nothing for an empty list', async () => {
    const { send, storage } = fake();
    await storage.delete(['a.webp', 'b.webp']);
    const command = send.mock.calls[0][0] as DeleteObjectsCommand;
    expect(command).toBeInstanceOf(DeleteObjectsCommand);
    expect(command.input.Delete?.Objects).toEqual([{ Key: 'a.webp' }, { Key: 'b.webp' }]);
    send.mockClear();
    await storage.delete([]);
    expect(send).not.toHaveBeenCalled();
  });

  it('builds addresses from the public address of the bucket', () => {
    expect(fake().storage.urlFor('products/x/1.webp')).toBe('https://photos.juhar.co.in/products/x/1.webp');
  });
});

describe('NoStorage', () => {
  it('refuses uploads with a code that says storage is not set up', async () => {
    const error = await new NoStorage('').put().catch((e) => e);
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.message).toBe('MEDIA_STORAGE_NOT_CONFIGURED');
  });

  it('can still delete (nothing was ever stored) and name an address', async () => {
    await expect(new NoStorage('').delete()).resolves.toBeUndefined();
    expect(new NoStorage('https://x.test').urlFor('k')).toBe('https://x.test/k');
  });
});

describe('createStorage', () => {
  it('builds the kind the settings ask for', () => {
    expect(createStorage({ kind: 'local', dir: tmpdir(), publicUrl: 'http://x/media' }).kind).toBe('local');
    expect(createStorage({ kind: 'none', publicUrl: '' }).kind).toBe('none');
    expect(createStorage({ kind: 'r2', accountId: 'a', accessKeyId: 'b', secretAccessKey: 'c', bucket: 'd', publicUrl: 'https://p' }).kind).toBe('r2');
  });
});
