import { ConsoleLogger, ConsoleLoggerOptions, LogLevel } from '@nestjs/common';
import { currentRequestId } from './request-context';
import { redact } from './redact';

/**
 * The API's logger. Same output as Nest's default, plus:
 *  - every line written while handling a request starts with req=<request id>
 *  - phone numbers and tokens are masked in whatever gets logged
 * Which levels appear is set by LOG_LEVEL (see config/log-level.ts).
 * With `plain` the colour codes are left out, which keeps production logs readable in a log viewer.
 */
// eslint-disable-next-line no-control-regex
const COLOUR_CODES = /\u001b\[[0-9;]*m/g;

export class AppLogger extends ConsoleLogger {
  private readonly plain: boolean;

  constructor(context = '', options: ConsoleLoggerOptions & { plain?: boolean } = {}) {
    super(context, options);
    this.plain = !!options.plain;
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    const line = super.formatMessage(logLevel, message, pidMessage, formattedLogLevel, contextMessage, timestampDiff);
    return this.plain ? line.replace(COLOUR_CODES, '') : line;
  }

  private decorate(message: unknown): unknown {
    if (typeof message !== 'string') return message;
    const id = currentRequestId();
    const text = redact(message);
    return id ? `req=${id} ${text}` : text;
  }

  private clean(params: unknown[]): unknown[] {
    return params.map((p) => (typeof p === 'string' ? redact(p) : p));
  }

  log(message: unknown, ...params: unknown[]) {
    super.log(this.decorate(message), ...this.clean(params));
  }
  warn(message: unknown, ...params: unknown[]) {
    super.warn(this.decorate(message), ...this.clean(params));
  }
  error(message: unknown, ...params: unknown[]) {
    super.error(this.decorate(message), ...this.clean(params));
  }
  debug(message: unknown, ...params: unknown[]) {
    super.debug(this.decorate(message), ...this.clean(params));
  }
  verbose(message: unknown, ...params: unknown[]) {
    super.verbose(this.decorate(message), ...this.clean(params));
  }
  fatal(message: unknown, ...params: unknown[]) {
    super.fatal(this.decorate(message), ...this.clean(params));
  }
}
