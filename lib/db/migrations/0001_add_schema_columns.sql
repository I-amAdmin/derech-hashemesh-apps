ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "customer_note" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "viewed_at" timestamp;

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "delivery_address" text;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_before_vat" numeric(10, 2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "price_after_vat" numeric(10, 2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size_small" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size_medium" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "size_large" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight_or_amount" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_notes" text;
