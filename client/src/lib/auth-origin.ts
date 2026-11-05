export const OAUTH_REDIRECT_URI = 'https://companion-production-00ab.up.railway.app/';
const CALLBACK_ORIGIN = new URL(OAUTH_REDIRECT_URI).origin;

/** Start OAuth on the same origin as the callback registered with Bungie. */
export function canonicalLoginEntry(origin: string): string | null {
  const url = new URL(origin);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (local || url.origin === CALLBACK_ORIGIN) return null;
  return CALLBACK_ORIGIN + '/';
}
