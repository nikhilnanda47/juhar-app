-- Allowed values for the "status" style columns (tracker item 71).
--
-- Order status, payment status, publish status, reservation status, admin role and the like were free text that
-- only the app checked. A typo ("deliverd"), a bug or a manual SQL change could store a value the rest of the system
-- does not understand: an order that no screen, filter or count knows what to do with. With these rules the database
-- itself refuses a value that is not in the list. The lists are the ones in packages/shared (the enums the app uses),
-- and a test (status-check-constraints.spec.ts) fails if the two ever drift apart: adding a new status means
-- adding it to the enum AND to a new migration that replaces the constraint.
--
-- Not covered yet, on purpose: payments, returns, refunds and webhook events. Nothing writes to them today, and
-- their lists should be set when those features are built.

-- ── 1. Pre-flight check ───────────────────────────────────────────────────────
-- Adding a CHECK fails if any existing row already breaks it, with an error that does not say which. This block
-- stops first and lists every column with an unexpected value, and the query that shows them. It never changes any
-- data: fix the rows yourself, then run the migration again.
DO $$
DECLARE
  r record;
  n bigint;
  problems text := '';
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('users',                  'status',         ARRAY['active','suspended']),
      ('products',               'publish_status', ARRAY['draft','published','archived']),
      ('product_media',          'type',           ARRAY['image','video']),
      ('inventory_reservations', 'status',         ARRAY['held','committed','released','expired','fulfilled']),
      ('orders',                 'status',         ARRAY['placed','confirmed','packed','shipped','delivered','cancelled','return_requested','return_approved','return_rejected','returned','refund_pending','refunded']),
      ('orders',                 'payment_status', ARRAY['pending','initiated','success','failed','expired','cod_pending','refund_pending','refunded']),
      ('orders',                 'payment_mode',   ARRAY['upi','cod']),
      ('shipments',              'status',         ARRAY['pending','dispatched','in_transit','out_for_delivery','delivered','rto']),
      ('admin_users',            'role',           ARRAY['owner','catalog_editor','fulfillment_operator','support']),
      ('admin_users',            'status',         ARRAY['active','suspended'])
    ) AS t(tbl, col, allowed)
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE NOT (%I = ANY ($1))', r.tbl, r.col) INTO n USING r.allowed;
    IF n > 0 THEN
      problems := problems || format(
        E'\n  %s.%s: %s row(s) with a value that is not one of (%s)  -> SELECT %I, count(*) FROM %I WHERE NOT (%I = ANY (ARRAY[%s])) GROUP BY 1;',
        r.tbl, r.col, n, array_to_string(r.allowed, ', '), r.col, r.tbl, r.col, '''' || array_to_string(r.allowed, ''',''') || ''''
      );
    END IF;
  END LOOP;

  IF problems <> '' THEN
    RAISE EXCEPTION E'Cannot add the status CHECK constraints: existing rows have values outside the allowed lists. Fix the rows (no data was changed), then run the migration again.%', problems;
  END IF;
END $$;

-- ── 2. Constraints ────────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD CONSTRAINT "chk_users_status_allowed" CHECK ("status" IN ('active','suspended'));

ALTER TABLE "products"
  ADD CONSTRAINT "chk_products_publish_status_allowed" CHECK ("publish_status" IN ('draft','published','archived'));

ALTER TABLE "product_media"
  ADD CONSTRAINT "chk_product_media_type_allowed" CHECK ("type" IN ('image','video'));

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "chk_inventory_reservations_status_allowed" CHECK ("status" IN ('held','committed','released','expired','fulfilled'));

ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_status_allowed" CHECK ("status" IN ('placed','confirmed','packed','shipped','delivered','cancelled','return_requested','return_approved','return_rejected','returned','refund_pending','refunded')),
  ADD CONSTRAINT "chk_orders_payment_status_allowed" CHECK ("payment_status" IN ('pending','initiated','success','failed','expired','cod_pending','refund_pending','refunded')),
  ADD CONSTRAINT "chk_orders_payment_mode_allowed" CHECK ("payment_mode" IN ('upi','cod'));

ALTER TABLE "shipments"
  ADD CONSTRAINT "chk_shipments_status_allowed" CHECK ("status" IN ('pending','dispatched','in_transit','out_for_delivery','delivered','rto'));

ALTER TABLE "admin_users"
  ADD CONSTRAINT "chk_admin_users_role_allowed" CHECK ("role" IN ('owner','catalog_editor','fulfillment_operator','support')),
  ADD CONSTRAINT "chk_admin_users_status_allowed" CHECK ("status" IN ('active','suspended'));
