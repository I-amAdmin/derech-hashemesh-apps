import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, quotesTable, quoteItemsTable } from "@workspace/db";
import { eq, desc, sum, count } from "drizzle-orm";
import {
  CreateQuoteBody,
  GetQuoteParams,
  DeleteQuoteParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/quotes", async (req, res) => {
  const quotes = await db
    .select({
      id: quotesTable.id,
      customerName: quotesTable.customerName,
      customerPhone: quotesTable.customerPhone,
      date: quotesTable.date,
      totalAmount: quotesTable.totalAmount,
      notes: quotesTable.notes,
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

router.post("/quotes", async (req, res) => {
  const body = CreateQuoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { customerName, customerPhone, date: quoteDate, notes, items } = body.data;

  const allProducts = await db.select().from(productsTable);
  const productMap = Object.fromEntries(allProducts.map((p) => [p.id, p]));

  let totalAmount = 0;
  const resolvedItems = items.map((item) => {
    const product = productMap[item.productId];
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const weightKg = Number(product.weightKg);
    const pricePerKg = Number(product.pricePerKg);
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
    };
  });

  const [newQuote] = await db
    .insert(quotesTable)
    .values({
      customerName,
      customerPhone: customerPhone ?? null,
      date: String(quoteDate),
      notes: notes ?? null,
      totalAmount: String(totalAmount),
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
    items: savedItems.map((item) => ({
      ...item,
      weightKg: Number(item.weightKg),
      pricePerKg: Number(item.pricePerKg),
      totalPrice: Number(item.totalPrice),
    })),
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

export default router;
