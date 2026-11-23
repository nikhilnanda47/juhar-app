import type { LogLevel } from '@nestjs/common';

/** The LOG_LEVEL setting, from quietest to chattiest. Each level includes the ones before it. */
export const LOG_LEVEL_NAMES = ['error', 'warn', 'log', 'debug', 'verbose'] as const;
export type LogLevelName = (typeof LOG_LEVEL_NAMES)[number];

/** Unset or empty means "log" (normal output). */
export function resolveLogLevel(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : 'log';
}

/** The Nest log levels to switch on for a LOG_LEVEL name: "warn" gives errors and warnings only. */
export function logLevelsFor(name: string): LogLevel[] {
  const index = LOG_LEVEL_NAMES.indexOf(name as LogLevelName);
  const wanted = LOG_LEVEL_NAMES.slice(0, (index === -1 ? LOG_LEVEL_NAMES.indexOf('log') : index) + 1);
  return ['fatal', ...wanted] as LogLevel[];
}
