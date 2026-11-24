import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { runWithRequestContext } from './request-context';

// A caller (or a proxy) may send its own X-Request-Id to trace a request across systems.
// Only a plain, short value is accepted; anything else is replaced so it cannot spoil the logs.
const ACCEPTED = /^[A-Za-z0-9._-]{8,64}$/;

export interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Gives every request one ID, used in all its log lines, in the reply body (`requestId`)
 * and in the X-Request-Id response header.
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  const sent = req.headers['x-request-id'];
  const requestId = typeof sent === 'string' && ACCEPTED.test(sent) ? sent : uuid();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  runWithRequestContext({ requestId }, () => next());
}

/** The ID of this request (falls back to a new one if the middleware did not run, as in some tests). */
export function requestIdOf(req: RequestWithId): string {
  return req.requestId ?? uuid();
}
