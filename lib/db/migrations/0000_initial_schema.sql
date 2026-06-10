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
  CONSTRAINT "quote_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE cascade,
  CONSTRAINT "quote_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null
);
