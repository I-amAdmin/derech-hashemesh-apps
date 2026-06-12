import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RequestChangesPublicQuoteBody } from "@workspace/api-zod";
import { sendPushNotifications } from "../lib/push-notifications.js";

const router = Router();

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

export default router;
