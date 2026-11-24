// Things that depend on who is logged in (the saved items, for example) learn about a login or a
// logout from here, so they never keep showing the previous person's data.

export const AUTH_CHANGED_EVENT = 'juhar-auth-changed';

/** Tell anything listening that the customer logged in or out. */
export function notifyAuthChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
