import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext } from './request-context';
import type { RequestWithId } from './request-id.middleware';

const MAX_MESSAGE = 120;

/**
 * One line per request, written when the response has been sent, so failures, rejected logins
 * and unknown routes are logged too, with the time they took:
 *   GET /api/v1/cart 200 12ms user=<id>
 *   POST /api/v1/auth/otp/verify 401 3ms user=anon code=AUTH_003 "Invalid OTP. Please try again."
 * 5xx is logged as an error, 4xx as a warning, the rest as normal output. The health check and
 * browser preflight requests are only logged in debug mode. Query strings, bodies and headers
 * are never logged.
 */
export function createAccessLogMiddleware(logger: Logger = new Logger('HTTP')) {
  return (req: RequestWithId & { user?: { id?: string } }, res: Response, next: NextFunction): void => {
    const started = Date.now();
    res.on('finish', () => {
      const status = res.statusCode;
      const path = (req.originalUrl || req.url).split('?')[0];
      let line = `${req.method} ${path} ${status} ${Date.now() - started}ms user=${req.user?.id ?? 'anon'}`;

      const code = res.locals?.errorCode;
      if (code) line += ` code=${code}`;
      const message = res.locals?.errorMessage;
      if (message) line += ` "${String(message).slice(0, MAX_MESSAGE)}"`;

      const quiet = path === '/health' || req.method === 'OPTIONS';
      const write = () => {
        if (quiet) logger.debug(line);
        else if (status >= 500) logger.error(line);
        else if (status >= 400) logger.warn(line);
        else logger.log(line);
      };
      // the finish event may fire outside the request's context, so set it again for the request ID
      if (req.requestId) runWithRequestContext({ requestId: req.requestId }, write);
      else write();
    });
    next();
  };
}
