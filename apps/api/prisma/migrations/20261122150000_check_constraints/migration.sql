-- Data integrity CHECK constraints from docs/architecture/database-design.md
-- (sections 3 and 6). Prisma's schema language cannot declare CHECK constraints,
-- so they live in this hand-written migration. Prisma does not report them as drift.
--
-- Until now these rules were enforced only by application code. With them in the
-- database, a bug or a manual SQL change can no longer store negative stock, stock
-- that is reserved beyond what is on the shelf, an order whose total does not add
-- up, and so on: the write fails instead.

-- ── 1. Pre-flight check ───────────────────────────────────────────────────────
-- Adding a CHECK fails if any existing row already breaks it, with an error that
-- does not say which rows. This block stops first and lists every problem with the
-- query that finds the rows. It never changes any data: fix or remove the rows
-- yourself, then run the migration again.
DO $$
DECLARE
  problems text := '';
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM inventory WHERE on_hand < 0 OR reserved < 0 OR unavailable < 0;
  IF n > 0 THEN problems := problems || format(E'\n  inventory: %s row(s) with a negative on_hand, reserved or unavailable  -> SELECT * FROM inventory WHERE on_hand < 0 OR reserved < 0 OR unavailable < 0;', n); END IF;

  SELECT count(*) INTO n FROM inventory WHERE reserved + unavailable > on_hand;
  IF n > 0 THEN problems := problems || format(E'\n  inventory: %s row(s) where reserved + unavailable is more than on_hand  -> SELECT * FROM inventory WHERE reserved + unavailable > on_hand;', n); END IF;

  SELECT count(*) INTO n FROM inventory_reservations WHERE qty <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  inventory_reservations: %s row(s) with qty <= 0  -> SELECT * FROM inventory_reservations WHERE qty <= 0;', n); END IF;

  SELECT count(*) INTO n FROM cart_items WHERE quantity <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  cart_items: %s row(s) with quantity <= 0  -> SELECT * FROM cart_items WHERE quantity <= 0;', n); END IF;

  SELECT count(*) INTO n FROM orders WHERE subtotal_paise < 0 OR discount_paise < 0 OR shipping_paise < 0 OR tax_paise < 0 OR total_paise < 0;
  IF n > 0 THEN problems := problems || format(E'\n  orders: %s row(s) with a negative amount  -> SELECT * FROM orders WHERE subtotal_paise < 0 OR discount_paise < 0 OR shipping_paise < 0 OR tax_paise < 0 OR total_paise < 0;', n); END IF;

  SELECT count(*) INTO n FROM orders WHERE total_paise <> subtotal_paise - discount_paise + shipping_paise + tax_paise;
  IF n > 0 THEN problems := problems || format(E'\n  orders: %s row(s) where total <> subtotal - discount + shipping + tax  -> SELECT * FROM orders WHERE total_paise <> subtotal_paise - discount_paise + shipping_paise + tax_paise;', n); END IF;

  SELECT count(*) INTO n FROM order_items WHERE qty <= 0 OR unit_price_paise <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  order_items: %s row(s) with qty <= 0 or unit_price_paise <= 0  -> SELECT * FROM order_items WHERE qty <= 0 OR unit_price_paise <= 0;', n); END IF;

  SELECT count(*) INTO n FROM payments WHERE amount_paise <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  payments: %s row(s) with amount_paise <= 0  -> SELECT * FROM payments WHERE amount_paise <= 0;', n); END IF;

  SELECT count(*) INTO n FROM returns WHERE qty <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  returns: %s row(s) with qty <= 0  -> SELECT * FROM returns WHERE qty <= 0;', n); END IF;

  SELECT count(*) INTO n FROM refunds WHERE amount_paise <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  refunds: %s row(s) with amount_paise <= 0  -> SELECT * FROM refunds WHERE amount_paise <= 0;', n); END IF;

  SELECT count(*) INTO n FROM product_variants WHERE price_paise <= 0;
  IF n > 0 THEN problems := problems || format(E'\n  product_variants: %s row(s) with price_paise <= 0  -> SELECT * FROM product_variants WHERE price_paise <= 0;', n); END IF;

  SELECT count(*) INTO n FROM product_variants WHERE compare_at_paise IS NOT NULL AND compare_at_paise <= price_paise;
  IF n > 0 THEN problems := problems || format(E'\n  product_variants: %s row(s) where compare_at_paise is not above price_paise  -> SELECT * FROM product_variants WHERE compare_at_paise IS NOT NULL AND compare_at_paise <= price_paise;', n); END IF;

  IF problems <> '' THEN
    RAISE EXCEPTION E'Cannot add the CHECK constraints: existing rows break these rules. Fix or remove the rows (no data was changed), then run the migration again.%', problems;
  END IF;
END $$;

-- ── 2. Constraints ────────────────────────────────────────────────────────────

-- Stock: never negative, and what is held or unavailable never exceeds what is on the shelf.
ALTER TABLE "inventory"
  ADD CONSTRAINT "chk_inventory_on_hand_non_negative"    CHECK ("on_hand" >= 0),
  ADD CONSTRAINT "chk_inventory_reserved_non_negative"   CHECK ("reserved" >= 0),
  ADD CONSTRAINT "chk_inventory_unavailable_non_negative" CHECK ("unavailable" >= 0),
  ADD CONSTRAINT "chk_inventory_reserved_within_on_hand" CHECK ("reserved" + "unavailable" <= "on_hand");

ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "chk_inventory_reservations_qty_positive" CHECK ("qty" > 0);

ALTER TABLE "cart_items"
  ADD CONSTRAINT "chk_cart_items_quantity_positive" CHECK ("quantity" > 0);

-- Prices: positive, and a compare-at (MRP) price is only stored when it is above the price.
ALTER TABLE "product_variants"
  ADD CONSTRAINT "chk_product_variants_price_positive" CHECK ("price_paise" > 0),
  ADD CONSTRAINT "chk_product_variants_compare_at_above_price" CHECK ("compare_at_paise" IS NULL OR "compare_at_paise" > "price_paise");

-- Orders: no negative amounts, and the total always adds up.
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_amounts_non_negative" CHECK (
    "subtotal_paise" >= 0 AND "discount_paise" >= 0 AND "shipping_paise" >= 0
    AND "tax_paise" >= 0 AND "total_paise" >= 0
  ),
  ADD CONSTRAINT "chk_orders_total_formula" CHECK (
    "total_paise" = "subtotal_paise" - "discount_paise" + "shipping_paise" + "tax_paise"
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "chk_order_items_qty_positive"        CHECK ("qty" > 0),
  ADD CONSTRAINT "chk_order_items_unit_price_positive" CHECK ("unit_price_paise" > 0);

-- Money moving back and forth: positive amounts and quantities.
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_amount_positive" CHECK ("amount_paise" > 0);
ALTER TABLE "returns"  ADD CONSTRAINT "chk_returns_qty_positive"     CHECK ("qty" > 0);
ALTER TABLE "refunds"  ADD CONSTRAINT "chk_refunds_amount_positive"  CHECK ("amount_paise" > 0);
