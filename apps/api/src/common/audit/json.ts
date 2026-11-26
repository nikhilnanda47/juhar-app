// Audit entries and a few columns (like a variant's attributes) hold plain JSON. Prisma wants such values typed as
// InputJsonValue; what we put in is always plain data (strings, numbers, booleans, null, lists and objects of those),
// which TypeScript cannot see through a `Record<string, unknown>`. These two helpers are the one place that says so,
// instead of an `as any` at every call.
import { Prisma } from '@prisma/client';

/** Plain data, ready for a JSON column. Pass only plain data (no dates, functions or class instances). */
export function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Like asJson, but a missing value is stored as JSON null (the way the attributes column treats "none"). */
export function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value == null ? Prisma.JsonNull : asJson(value);
}
