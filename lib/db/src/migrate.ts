import pg from "pg";

const { Pool } = pg;

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "0000_initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" serial PRIMARY KEY NOT NULL,
        "business_name" text NOT NULL,
        "contact_name" text,
        "phone" text,
        "email" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "products" (
        "id" serial PRIMARY KEY NOT NULL,
        "barcode" text NOT NULL,
        "description" text NOT NULL,
        "weight_kg" numeric(10, 3) NOT NULL,
        "price_per_kg" numeric(10, 2) NOT NULL,
        "department" text DEFAULT 'כללי' NOT NULL,
        "notes" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "quotes" (
        "id" serial PRIMARY KEY NOT NULL,
        "customer_name" text NOT NULL,
        "contact_name" text,
        "customer_phone" text,
        "email" text,
        "date" date NOT NULL,
        "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
        "notes" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "share_token" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "quotes_share_token_unique" UNIQUE("share_token")
      );

      CREATE TABLE IF NOT EXISTS "quote_items" (
        "id" serial PRIMARY KEY NOT NULL,
        "quote_id" integer NOT NULL,
        "product_id" integer,
        "barcode" text NOT NULL,
        "description" text NOT NULL,
        "weight_kg" numeric(10, 3) NOT NULL,
        "price_per_kg" numeric(10, 2) NOT NULL,
        "quantity" integer NOT NULL,
        "total_price" numeric(12, 2) NOT NULL,
        CONSTRAINT "quote_items_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE cascade,
        CONSTRAINT "quote_items_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null
      );
    `,
  },
  {
    name: "0001_add_schema_columns",
    sql: `
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
    `,
  },
];

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set before running migrations");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS __app_migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamp DEFAULT now() NOT NULL
      )
    `);

    for (const migration of MIGRATIONS) {
      const { rows } = await pool.query(
        "SELECT 1 FROM __app_migrations WHERE name = $1",
        [migration.name]
      );

      if (rows.length === 0) {
        await pool.query(migration.sql);
        await pool.query(
          "INSERT INTO __app_migrations (name) VALUES ($1)",
          [migration.name]
        );
      }
    }
  } finally {
    await pool.end();
  }
}
