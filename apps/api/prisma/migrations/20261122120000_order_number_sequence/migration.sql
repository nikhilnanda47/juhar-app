-- Order numbers come from a sequence so orders placed at the same moment never collide.
CREATE SEQUENCE "order_number_seq" AS BIGINT START WITH 1;

-- Continue after the highest number already used (PREFIX-YYYYMMDD-NNNN), so
-- existing orders are never clashed with. With no orders the first number is 1.
SELECT setval(
  'order_number_seq',
  GREATEST(
    COALESCE(
      (SELECT MAX(split_part("public_number", '-', 3)::BIGINT)
         FROM "orders"
        WHERE "public_number" ~ '^[A-Z]+-[0-9]{8}-[0-9]+$'),
      0
    ),
    1
  ),
  EXISTS (SELECT 1 FROM "orders" WHERE "public_number" ~ '^[A-Z]+-[0-9]{8}-[0-9]+$')
);
