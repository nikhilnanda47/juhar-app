// Which server the app talks to. It is a setting of each build (EXPO_PUBLIC_API_URL), not a fact written
// in the code: your laptop, the pilot environment and production each get their own build setting.
//   development, nothing set  -> the API on this computer (http://localhost:3000)
//   anything set              -> that address
//   a release build, nothing set, or a placeholder / non-https address -> the app refuses to start,
//   saying what to fix, instead of quietly pointing at a server that is not there.

export const LOCAL_API = 'http://localhost:3000';

// Addresses that were placeholders at some point and must never reach a real build
const PLACEHOLDER_HOSTS = ['api.juhar.in'];

export function resolveApiBase({ isDev, envUrl }: { isDev: boolean; envUrl?: string | null }): string {
  const raw = (envUrl ?? '').trim();

  if (!raw) {
    if (isDev) return LOCAL_API;
    throw new Error(
      'This build has no API address. Set EXPO_PUBLIC_API_URL for the build (see the profiles in apps/mobile/eas.json), ' +
        'for example https://api.juhar.co.in.',
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL "${raw}" is not a web address. Write it like https://api.juhar.co.in.`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`EXPO_PUBLIC_API_URL "${raw}" must start with https:// (or http:// for local development).`);
  }
  if (/replace/i.test(raw) || PLACEHOLDER_HOSTS.includes(url.hostname)) {
    throw new Error(`EXPO_PUBLIC_API_URL "${raw}" is still a placeholder. Put the real API address in the build profile.`);
  }
  if (!isDev && url.protocol !== 'https:') {
    throw new Error(`EXPO_PUBLIC_API_URL "${raw}" must be https:// in a release build, so logins and orders are encrypted.`);
  }

  return raw.replace(/\/+$/, ''); // no trailing slash: the paths start with one
}
