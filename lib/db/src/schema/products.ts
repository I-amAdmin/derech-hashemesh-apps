import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull(),
  description: text("description").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  department: text("department").notNull().default("כללי"),
  notes: text("notes"),
  priceBeforeVat: numeric("price_before_vat", { precision: 10, scale: 2 }),
  priceAfterVat: numeric("price_after_vat", { precision: 10, scale: 2 }),
  sizeSmall: text("size_small"),
  sizeMedium: text("size_medium"),
  sizeLarge: text("size_large"),
  weightOrAmount: text("weight_or_amount"),
  productNotes: text("product_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
