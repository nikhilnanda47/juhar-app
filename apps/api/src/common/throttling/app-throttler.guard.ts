import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';

/** Same as the stock guard, but answers with the API's normal error shape and a clear message. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    // Log what kind of caller was blocked (user / ip / phone), never the phone number itself.
    const kind = String(detail.tracker).split(':')[0];
    this.logger.warn(`Rate limit reached: ${req.method} ${req.path} (counted by ${kind})`);

    // Standard header: how many seconds until the caller may try again.
    const wait = Math.max(detail.timeToExpire ?? 0, detail.timeToBlockExpire ?? 0);
    context.switchToHttp().getResponse().header('Retry-After', String(Math.max(1, Math.ceil(wait))));

    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait a few minutes and try again.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
