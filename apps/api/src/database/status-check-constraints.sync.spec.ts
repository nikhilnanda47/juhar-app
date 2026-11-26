// The allowed-value lists in the database and the enums the app uses must be the same lists. This reads the migration
// (no database needed) and compares it with packages/shared, so adding a status to the app without a migration that
// widens the database rule fails here, in CI, instead of failing for a customer when an order is saved.
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AdminRole, MediaType, OrderStatus, PaymentMode, PaymentStatus, PublishStatus, ReservationStatus, ShipmentStatus, UserStatus,
} from '@juhar/shared';

const MIGRATION = join(__dirname, '../../prisma/migrations/20261126130000_status_check_constraints/migration.sql');

/** [table, column, the constraint's name, the enum the app uses] */
const RULES: [string, string, string, Record<string, string>][] = [
  ['users', 'status', 'chk_users_status_allowed', UserStatus],
  ['products', 'publish_status', 'chk_products_publish_status_allowed', PublishStatus],
  ['product_media', 'type', 'chk_product_media_type_allowed', MediaType],
  ['inventory_reservations', 'status', 'chk_inventory_reservations_status_allowed', ReservationStatus],
  ['orders', 'status', 'chk_orders_status_allowed', OrderStatus],
  ['orders', 'payment_status', 'chk_orders_payment_status_allowed', PaymentStatus],
  ['orders', 'payment_mode', 'chk_orders_payment_mode_allowed', PaymentMode],
  ['shipments', 'status', 'chk_shipments_status_allowed', ShipmentStatus],
  ['admin_users', 'role', 'chk_admin_users_role_allowed', AdminRole],
  ['admin_users', 'status', 'chk_admin_users_status_allowed', UserStatus],
];

const sql = readFileSync(MIGRATION, 'utf8');
const listOf = (text: string) => [...text.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();

describe('status CHECK constraints match the app\'s enums', () => {
  it.each(RULES)('%s.%s: the constraint lists exactly the enum values', (table, column, name, enumeration) => {
    const found = sql.match(new RegExp(`ADD CONSTRAINT "${name}" CHECK \\("${column}" IN \\(([^)]*)\\)\\)`));
    expect(found).not.toBeNull();
    expect(listOf(found![1])).toEqual(Object.values(enumeration).sort());
  });

  it.each(RULES)('%s.%s: the pre-flight check uses the same list', (table, column, _name, enumeration) => {
    const found = sql.match(new RegExp(`\\('${table}',\\s+'${column}',\\s+ARRAY\\[([^\\]]*)\\]\\)`));
    expect(found).not.toBeNull();
    expect(listOf(found![1])).toEqual(Object.values(enumeration).sort());
  });

  it('has no constraint that this test does not check (a new rule needs a new line in RULES)', () => {
    const names = [...sql.matchAll(/ADD CONSTRAINT "(chk_\w+)"/g)].map((m) => m[1]).sort();
    expect(names).toEqual(RULES.map((r) => r[2]).sort());
  });

  it('never changes data (it only checks, then adds rules)', () => {
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT|TRUNCATE|DROP)\b/i);
  });
});
