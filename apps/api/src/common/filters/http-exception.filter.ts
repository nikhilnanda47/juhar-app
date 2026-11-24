import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { requestIdOf } from '../logging/request-id.middleware';
import { friendlyError } from '../errors/error-catalog';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = requestIdOf(request);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;
    // What the logs record as the message. It stays the exact text that was thrown (it may carry a
    // SKU or numbers), while the customer gets a sentence.
    let logMessage: string | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as Record<string, unknown>;

      if (typeof body === 'string') {
        message = body;
      } else {
        code = (body.code as string) || `HTTP_${status}`;
        message = (body.message as string) || exception.message;
        details = body.details;

        // Handle class-validator errors
        if (Array.isArray(body.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = body.message;
        } else if (!body.code) {
          // Errors thrown as a plain code ("INSUFFICIENT_STOCK"): send the code as the code and a sentence as the message
          const friendly = friendlyError(body.message);
          if (friendly) {
            logMessage = String(body.message);
            code = friendly.code;
            message = friendly.message;
          }
        }
      }
    }

    // The access log line (common/logging) already records every response with its status and code.
    // It reads these two values, so put them where it can find them.
    response.locals.errorCode = code;
    response.locals.errorMessage = logMessage === code ? undefined : (logMessage ?? message);

    if (status >= 500) {
      // A real failure: log the details, including the stack. Never send them to the client.
      const detail = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `${request.method} ${request.path} failed with ${status} ${code}: ${detail}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (details) {
      // Client mistakes (4xx) are warnings in the access log; the field details are for debugging
      this.logger.debug(`${request.method} ${request.path} ${code} details: ${JSON.stringify(details)}`);
    }

    response.status(status).json({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      requestId,
    });
  }
}
