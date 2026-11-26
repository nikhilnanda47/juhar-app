// What a page should say when its data could not be loaded: "You're offline" when the browser could not reach the
// server at all, "not found" when the server answered that the thing does not exist, and a plain
// "something went wrong" (with the API's reference) for anything else.

export type LoadFailureKind = 'offline' | 'not_found' | 'error';

export interface LoadFailure {
  kind: LoadFailureKind;
  message: string;
  /** the API's reference for the failed request (empty when the server was never reached) */
  reference: string;
}

/** The API client throws an `ApiError` with code NETWORK_ERROR when the request never got an answer. */
export function isNetworkError(err: unknown): boolean {
  return (err as { code?: string } | null | undefined)?.code === 'NETWORK_ERROR';
}

export function describeLoadFailure(err: unknown, fallback = 'Something went wrong. Please try again.'): LoadFailure {
  const e = (err ?? {}) as { code?: string; status?: number; message?: string; requestId?: string };
  if (isNetworkError(err)) return { kind: 'offline', message: '', reference: '' };
  const kind: LoadFailureKind = e.status === 404 ? 'not_found' : 'error';
  // Only the API's own messages are written for customers. Any other error (a bug, a browser message) is not shown.
  return { kind, message: (e.code && e.message) || fallback, reference: e.requestId || '' };
}
