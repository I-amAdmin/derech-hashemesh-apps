import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, avg, sum, count } from "drizzle-orm";
import {
  CreateProductBody,
  UpdateProductBody,
  GetProductParams,
  UpdateProductParams,
  DeleteProductParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/products", async (req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.description);
  res.json(
    products.map((p) => ({
      ...p,
      weightKg: Number(p.weightKg),
      pricePerKg: Number(p.pricePerKg),
    }))
  );
});

router.get("/products/stats", async (req, res) => {
  const [stats] = await db
    .select({
      totalProducts: count(),
      avgPricePerKg: avg(productsTable.pricePerKg),
      totalWeightKg: sum(productsTable.weightKg),
    })
    .from(productsTable);

  res.json({
    totalProducts: Number(stats.totalProducts),
    avgPricePerKg: Number(stats.avgPricePerKg ?? 0),
    totalWeightKg: Number(stats.totalWeightKg ?? 0),
  });
});

router.get("/products/:id", async (req, res) => {
  const params = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ ...product, weightKg: Number(product.weightKg), pricePerKg: Number(product.pricePerKg) });
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [created] = await db.insert(productsTable).values({
    barcode: body.data.barcode,
    description: body.data.description,
    weightKg: String(body.data.weightKg),
    pricePerKg: String(body.data.pricePerKg),
    notes: body.data.notes ?? null,
  }).returning();
  res.status(201).json({ ...created, weightKg: Number(created.weightKg), pricePerKg: Number(created.pricePerKg) });
});

router.put("/products/:id", async (req, res) => {
  const params = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.barcode !== undefined) updates.barcode = body.data.barcode;
  if (body.data.description !== undefined) updates.description = body.data.description;
  if (body.data.weightKg !== undefined) updates.weightKg = String(body.data.weightKg);
  if (body.data.pricePerKg !== undefined) updates.pricePerKg = String(body.data.pricePerKg);
  if (body.data.notes !== undefined) updates.notes = body.data.notes;

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ ...updated, weightKg: Number(updated.weightKg), pricePerKg: Number(updated.pricePerKg) });
});

router.delete("/products/:id", async (req, res) => {
  const params = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).send();
});

export default router;
