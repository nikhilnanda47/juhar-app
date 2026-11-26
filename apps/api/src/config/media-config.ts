// Where product photos are kept.
//
//   R2 (live):     R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and MEDIA_PUBLIC_URL (the address the
//                  bucket is public at, for example https://photos.juhar.co.in) are all set.
//   local (dev):   nothing is set and NODE_ENV is not "production": photos go to a folder on this computer
//                  (UPLOAD_DIR, default apps/api/uploads) and the API itself serves them at /media.
//   none:          nothing is set on a live API. The disk of a live server is wiped on every deploy, so uploads are
//                  refused (with a message that says why) instead of being accepted and lost.
//
// A half-filled R2 set is a typo that would only show up later as failed uploads, so it stops the start.

export type MediaConfig =
  | { kind: 'r2'; accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string }
  | { kind: 'local'; dir: string; publicUrl: string }
  | { kind: 'none'; publicUrl: string };

const R2_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'MEDIA_PUBLIC_URL'] as const;

const text = (env: Record<string, unknown>, key: string): string => {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
};

const withoutTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

/** Problems with the storage settings, as sentences. Empty when they are fine (or when none are set). */
export function mediaConfigProblems(env: Record<string, unknown>): string[] {
  const set = R2_KEYS.filter((key) => text(env, key) !== '');
  const r2Keys = R2_KEYS.filter((key) => key !== 'MEDIA_PUBLIC_URL');
  const anyR2 = r2Keys.some((key) => text(env, key) !== '');
  if (!anyR2) return [];
  const missing = R2_KEYS.filter((key) => !set.includes(key));
  const problems: string[] = [];
  if (missing.length > 0) {
    problems.push(`photo storage (Cloudflare R2) is only partly set; also set ${missing.join(', ')}`);
  }
  const publicUrl = text(env, 'MEDIA_PUBLIC_URL');
  if (publicUrl) {
    if (!/^https?:\/\/[^\s/]+/.test(publicUrl)) {
      problems.push('MEDIA_PUBLIC_URL must be a web address such as https://photos.example.com');
    } else if (env.NODE_ENV === 'production' && !publicUrl.startsWith('https://')) {
      problems.push('MEDIA_PUBLIC_URL must start with https:// on a live API');
    }
  }
  return problems;
}

export function resolveMediaConfig(env: Record<string, unknown>): MediaConfig {
  const accountId = text(env, 'R2_ACCOUNT_ID');
  const accessKeyId = text(env, 'R2_ACCESS_KEY_ID');
  const secretAccessKey = text(env, 'R2_SECRET_ACCESS_KEY');
  const bucket = text(env, 'R2_BUCKET');
  const publicUrl = withoutTrailingSlash(text(env, 'MEDIA_PUBLIC_URL'));

  if (accountId && accessKeyId && secretAccessKey && bucket && publicUrl) {
    return { kind: 'r2', accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
  }
  if (env.NODE_ENV === 'production') return { kind: 'none', publicUrl };

  const port = text(env, 'PORT') || '3000';
  return {
    kind: 'local',
    dir: text(env, 'UPLOAD_DIR') || `${process.cwd()}/uploads`,
    publicUrl: publicUrl || `http://localhost:${port}/media`,
  };
}
