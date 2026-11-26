// Where the bytes of a photo are kept. The database only stores the key ("products/<id>/<name>.webp"); the public
// address is built from the key at the moment a reply is made, so moving from a folder on one computer to Cloudflare R2
// changes a setting and the files, not the rows.
import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ServiceUnavailableException } from '@nestjs/common';
import { MediaConfig } from '../../config/media-config';

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StorageProvider {
  readonly kind: 'r2' | 'local' | 'none';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Removes files; one that is already gone is not an error */
  delete(keys: string[]): Promise<void>;
  /** The public address of a stored file */
  urlFor(key: string): string;
}

/** Photos never change once stored (a new upload gets a new name), so browsers and the CDN may keep them for a year. */
export const PHOTO_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export class LocalStorage implements StorageProvider {
  readonly kind = 'local' as const;
  private readonly root: string;

  constructor(dir: string, private readonly publicUrl: string) {
    this.root = resolve(dir);
  }

  /** The file for a key, never outside the upload folder */
  private pathFor(key: string): string {
    const full = resolve(this.root, key);
    if (full !== this.root && !full.startsWith(this.root + sep)) throw new Error(`Unsafe storage key: ${key}`);
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const file = this.pathFor(key);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, body);
  }

  async delete(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => rm(this.pathFor(key), { force: true })));
  }

  urlFor(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  get directory(): string {
    return this.root;
  }
}

export class R2Storage implements StorageProvider {
  readonly kind = 'r2' as const;

  constructor(private readonly client: Pick<S3Client, 'send'>, private readonly bucket: string, private readonly publicUrl: string) {}

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: PHOTO_CACHE_CONTROL,
    }));
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(new DeleteObjectsCommand({
      Bucket: this.bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }));
  }

  urlFor(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}

/** A live API with no photo storage set: nothing can be stored, and saying so beats losing the photo at the next deploy. */
export class NoStorage implements StorageProvider {
  readonly kind = 'none' as const;

  constructor(private readonly publicUrl: string) {}

  async put(): Promise<void> {
    throw new ServiceUnavailableException('MEDIA_STORAGE_NOT_CONFIGURED');
  }

  async delete(): Promise<void> {
    // nothing was ever stored
  }

  urlFor(key: string): string {
    return this.publicUrl ? `${this.publicUrl}/${key}` : key;
  }
}

export function createStorage(config: MediaConfig): StorageProvider {
  switch (config.kind) {
    case 'r2':
      return new R2Storage(
        new S3Client({
          region: 'auto', // R2 has no regions
          endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
          credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        }),
        config.bucket,
        config.publicUrl,
      );
    case 'local':
      return new LocalStorage(config.dir, config.publicUrl);
    default:
      return new NoStorage(config.publicUrl);
  }
}
