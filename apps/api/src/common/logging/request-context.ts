import { AsyncLocalStorage } from 'async_hooks';

// The request ID travels with the request through every await, so any log line written while
// handling it (in a service, a guard, a filter) can carry it without being passed around.
interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** The ID of the request being handled, or undefined outside a request (startup, scheduled jobs). */
export function currentRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
