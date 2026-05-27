import { pgTable, serial, text, numeric, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  contactName: text("contact_name"),
  customerPhone: text("customer_phone"),
  email: text("email"),
  date: date("date").notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteItemsTable = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  barcode: text("barcode").notNull(),
  description: text("description").notNull(),
  weightKg: numeric("weight_kg", { precision: 10, scale: 3 }).notNull(),
  pricePerKg: numeric("price_per_kg", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true, totalAmount: true });
export const insertQuoteItemSchema = createInsertSchema(quoteItemsTable).omit({ id: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
export type QuoteItem = typeof quoteItemsTable.$inferSelect;
