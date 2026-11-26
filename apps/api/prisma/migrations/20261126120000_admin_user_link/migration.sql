-- One identity for admins (tracker item 69).
--
-- Until now an admin was TWO unconnected records that only shared a phone number: a login (users) and a staff
-- record (admin_users). The audit trail names people by their login id (users.id), while refunds point at
-- admin_users.id, and turning an audit entry into a name and role meant matching phone numbers (fragile: a changed
-- or mistyped number silently drops the name). This links each staff record to its login with a real column.
--
-- Every admin gets exactly one login: an existing login with the same phone number is linked, and an admin who has
-- never signed in gets a login created for them (the same account they would have been given at first sign-in).
-- No customer data is changed and nothing is deleted. The steps are written to be safe on a database that already
-- has admins, orders and history.

-- 1. Logins for admins that have none yet
INSERT INTO "users" ("id", "phone", "name", "status", "created_at", "updated_at")
SELECT gen_random_uuid(), a."phone", a."name", 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "admin_users" a
WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."phone" = a."phone");

-- 2. The new column, filled from the phone number once (the last time the phone number is used to find a login)
ALTER TABLE "admin_users" ADD COLUMN "user_id" UUID;

UPDATE "admin_users" a
SET "user_id" = u."id"
FROM "users" u
WHERE u."phone" = a."phone";

-- 3. Every admin must now have a login (stops here, changing nothing, if one is somehow missing)
ALTER TABLE "admin_users" ALTER COLUMN "user_id" SET NOT NULL;

-- 4. One login is at most one admin, and the link must point at a real login (the same names Prisma uses)
CREATE UNIQUE INDEX "admin_users_user_id_key" ON "admin_users"("user_id");

ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
