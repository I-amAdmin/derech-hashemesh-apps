import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, quotesTable, quoteItemsTable } from "@workspace/db";
import { eq, desc, sum, count } from "drizzle-orm";
import crypto from "crypto";
import {
  CreateQuoteBody,
  UpdateQuoteBody,
  UpdateQuoteStatusBody,
  GetQuoteParams,
  UpdateQuoteParams,
  UpdateQuoteStatusParams,
  DeleteQuoteParams,
  RequestChangesPublicQuoteBody,
} from "@workspace/api-zod";
import { sendPushNotifications } from "../lib/push-notifications.js";

const router = Router();

router.get("/quotes", async (req, res) => {
  const quotes = await db
    .select({
      id: quotesTable.id,
      customerName: quotesTable.customerName,
      contactName: quotesTable.contactName,
      customerPhone: quotesTable.customerPhone,
      email: quotesTable.email,
      date: quotesTable.date,
      totalAmount: quotesTable.totalAmount,
      notes: quotesTable.notes,
      status: quotesTable.status,
      shareToken: quotesTable.shareToken,
      viewedAt: quotesTable.viewedAt,
      createdAt: quotesTable.createdAt,
    })
    .from(quotesTable)
    .orderBy(desc(quotesTable.createdAt));

  const itemCounts = await db
    .select({ quoteId: quoteItemsTable.quoteId, itemCount: count() })
    .from(quoteItemsTable)
    .groupBy(quoteItemsTable.quoteId);

  const countMap = Object.fromEntries(itemCounts.map((r) => [r.quoteId, Number(r.itemCount)]));

  res.json(
    quotes.map((q) => ({
      ...q,
      totalAmount: Number(q.totalAmount),
      itemCount: countMap[q.id] ?? 0,
    }))
  );
});

router.get("/quotes/public/:token", async (req, res) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.shareToken, token));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  let finalQuote = quote;
  if (!quote.viewedAt) {
    const [updated] = await db
      .update(quotesTable)
      .set({ viewedAt: new Date() })
      .where(eq(quotesTable.id, quote.id))
      .returning();
    finalQuote = updated;
  }

  const items = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, quote.id));

  res.json({
    ...finalQuote,
    totalAmount: Number(finalQuote.totalAmount),
    items: items.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  });
});

router.post("/quotes/public/:token/request-changes", async (req, res) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const body = RequestChangesPublicQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.shareToken, token));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  if (quote.status === "cancelled") {
    res.status(409).json({ error: "Quote is cancelled and cannot be updated" });
    return;
  }

  const [updated] = await db
    .update(quotesTable)
    .set({ status: "changes_requested", customerNote: body.data.note })
    .where(eq(quotesTable.id, quote.id))
    .returning();

  const items = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, quote.id));

  sendPushNotifications({
    title: "בקשת שינויים 🔄",
    body: `${quote.customerName} ביקש שינויים בהצעה #${quote.id}`,
    data: { quoteId: quote.id },
  }).catch(() => {});

  res.json({
    ...updated,
    totalAmount: Number(updated.totalAmount),
    items: items.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  });
});

router.post("/quotes/public/:token/approve", async (req, res) => {
  const token = req.params.token;
  if (!token) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.shareToken, token));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  if (quote.status === "cancelled") {
    res.status(409).json({ error: "Quote is cancelled and cannot be approved" });
    return;
  }

  const [updated] = await db
    .update(quotesTable)
    .set({ status: "approved" })
    .where(eq(quotesTable.id, quote.id))
    .returning();

  const items = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, quote.id));

  sendPushNotifications({
    title: "הצעה אושרה ✅",
    body: `${quote.customerName} אישר את הצעה #${quote.id}`,
    data: { quoteId: quote.id },
  }).catch(() => {});

  res.json({
    ...updated,
    totalAmount: Number(updated.totalAmount),
    items: items.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  });
});

router.get("/quotes/summary", async (req, res) => {
  const [totals] = await db
    .select({
      totalQuotes: count(),
      totalRevenue: sum(quotesTable.totalAmount),
    })
    .from(quotesTable);

  const recentRaw = await db
    .select()
    .from(quotesTable)
    .orderBy(desc(quotesTable.createdAt))
    .limit(5);

  const itemCounts = await db
    .select({ quoteId: quoteItemsTable.quoteId, itemCount: count() })
    .from(quoteItemsTable)
    .groupBy(quoteItemsTable.quoteId);

  const countMap = Object.fromEntries(itemCounts.map((r) => [r.quoteId, Number(r.itemCount)]));

  res.json({
    totalQuotes: Number(totals.totalQuotes),
    totalRevenue: Number(totals.totalRevenue ?? 0),
    recentQuotes: recentRaw.map((q) => ({
      ...q,
      totalAmount: Number(q.totalAmount),
      itemCount: countMap[q.id] ?? 0,
    })),
  });
});

router.get("/quotes/:id", async (req, res) => {
  const params = GetQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, params.data.id));
  if (!quote) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  const items = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, params.data.id));

  res.json({
    ...quote,
    totalAmount: Number(quote.totalAmount),
    items: items.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  });
});

function resolveItems(
  items: Array<{ productId: number; quantity: number; customPricePerKg?: number | null; selectedSize?: string | null }>,
  productMap: Record<number, { id: number; barcode: string; description: string; weightKg: string; pricePerKg: string }>
) {
  let totalAmount = 0;
  const resolved = items.map((item) => {
    const product = productMap[item.productId];
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const weightKg = Number(product.weightKg);
    const pricePerKg = item.customPricePerKg != null ? item.customPricePerKg : Number(product.pricePerKg);
    const totalPrice = pricePerKg * weightKg * item.quantity;
    totalAmount += totalPrice;
    return {
      productId: product.id,
      barcode: product.barcode,
      description: product.description,
      weightKg: String(weightKg),
      pricePerKg: String(pricePerKg),
      quantity: item.quantity,
      totalPrice: String(totalPrice),
      selectedSize: item.selectedSize ?? null,
    };
  });
  return { resolved, totalAmount };
}

router.post("/quotes", async (req, res) => {
  const body = CreateQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { customerName, contactName, customerPhone, email, date: quoteDate, notes, items } = body.data;

  const allProducts = await db.select().from(productsTable);
  const productMap = Object.fromEntries(allProducts.map((p) => [p.id, p]));

  const { resolved: resolvedItems, totalAmount } = resolveItems(items, productMap);

  const [newQuote] = await db
    .insert(quotesTable)
    .values({
      customerName,
      contactName: contactName ?? null,
      customerPhone: customerPhone ?? null,
      email: email ?? null,
      date: String(quoteDate).slice(0, 10),
      notes: notes ?? null,
      totalAmount: String(totalAmount),
      status: "pending",
    })
    .returning();

  if (resolvedItems.length > 0) {
    await db.insert(quoteItemsTable).values(
      resolvedItems.map((item) => ({ ...item, quoteId: newQuote.id }))
    );
  }

  const savedItems = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, newQuote.id));

  res.status(201).json({
    ...newQuote,
    totalAmount: Number(newQuote.totalAmount),
    itemCount: savedItems.length,
  });
});

router.put("/quotes/:id", async (req, res) => {
  const params = UpdateQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = UpdateQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  const { customerName, contactName, customerPhone, email, date: quoteDate, notes, items } = body.data;

  const allProducts = await db.select().from(productsTable);
  const productMap = Object.fromEntries(allProducts.map((p) => [p.id, p]));

  const { resolved: resolvedItems, totalAmount } = resolveItems(items, productMap);

  const [updatedQuote] = await db
    .update(quotesTable)
    .set({
      customerName,
      contactName: contactName ?? null,
      customerPhone: customerPhone ?? null,
      email: email ?? null,
      date: String(quoteDate).slice(0, 10),
      notes: notes ?? null,
      totalAmount: String(totalAmount),
    })
    .where(eq(quotesTable.id, params.data.id))
    .returning();

  await db.delete(quoteItemsTable).where(eq(quoteItemsTable.quoteId, params.data.id));

  if (resolvedItems.length > 0) {
    await db.insert(quoteItemsTable).values(
      resolvedItems.map((item) => ({ ...item, quoteId: params.data.id }))
    );
  }

  const savedItems = await db
    .select()
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, params.data.id));

  res.json({
    ...updatedQuote,
    totalAmount: Number(updatedQuote.totalAmount),
    items: savedItems.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
  });
});

router.patch("/quotes/:id/status", async (req, res) => {
  const params = UpdateQuoteStatusParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const body = UpdateQuoteStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(quotesTable)
    .set({ status: body.data.status })
    .where(eq(quotesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  const [itemCount] = await db
    .select({ cnt: count() })
    .from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, params.data.id));

  res.json({
    ...updated,
    totalAmount: Number(updated.totalAmount),
    itemCount: Number(itemCount.cnt),
  });
});

router.delete("/quotes/:id", async (req, res) => {
  const params = DeleteQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(quotesTable).where(eq(quotesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }
  res.status(204).send();
});

router.delete("/quotes/:id/share", async (req, res) => {
  const params = GetQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  await db
    .update(quotesTable)
    .set({ shareToken: null })
    .where(eq(quotesTable.id, params.data.id));

  res.status(204).send();
});

router.post("/quotes/:id/share", async (req, res) => {
  const params = GetQuoteParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db.select().from(quotesTable).where(eq(quotesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Quote not found" });
    return;
  }

  if (existing.shareToken) {
    res.json({ shareToken: existing.shareToken });
    return;
  }

  const shareToken = crypto.randomBytes(24).toString("base64url");
  const [updated] = await db
    .update(quotesTable)
    .set({ shareToken })
    .where(eq(quotesTable.id, params.data.id))
    .returning();

  res.json({ shareToken: updated.shareToken });
});

export default router;
