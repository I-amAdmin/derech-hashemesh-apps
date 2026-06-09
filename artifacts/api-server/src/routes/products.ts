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

function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    weightKg: Number(p.weightKg),
    pricePerKg: Number(p.pricePerKg),
    priceBeforeVat: p.priceBeforeVat != null ? Number(p.priceBeforeVat) : null,
    priceAfterVat: p.priceAfterVat != null ? Number(p.priceAfterVat) : null,
  };
}

router.get("/products", async (req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.department, productsTable.description);
  res.json(products.map(serializeProduct));
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
  res.json(serializeProduct(product));
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const d = body.data;
  const [created] = await db.insert(productsTable).values({
    barcode: d.barcode,
    description: d.description,
    weightKg: String(d.weightKg),
    pricePerKg: String(d.pricePerKg),
    department: d.department ?? "כללי",
    notes: d.notes ?? null,
    priceBeforeVat: d.priceBeforeVat != null ? String(d.priceBeforeVat) : null,
    priceAfterVat: d.priceAfterVat != null ? String(d.priceAfterVat) : null,
    sizeSmall: d.sizeSmall ?? null,
    sizeMedium: d.sizeMedium ?? null,
    sizeLarge: d.sizeLarge ?? null,
    weightOrAmount: d.weightOrAmount ?? null,
    productNotes: d.productNotes ?? null,
  }).returning();
  res.status(201).json(serializeProduct(created));
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

  const d = body.data;
  const updates: Record<string, unknown> = {};
  if (d.barcode !== undefined) updates.barcode = d.barcode;
  if (d.description !== undefined) updates.description = d.description;
  if (d.weightKg !== undefined) updates.weightKg = String(d.weightKg);
  if (d.pricePerKg !== undefined) updates.pricePerKg = String(d.pricePerKg);
  if (d.department !== undefined) updates.department = d.department;
  if (d.notes !== undefined) updates.notes = d.notes;
  if (d.priceBeforeVat !== undefined) updates.priceBeforeVat = d.priceBeforeVat != null ? String(d.priceBeforeVat) : null;
  if (d.priceAfterVat !== undefined) updates.priceAfterVat = d.priceAfterVat != null ? String(d.priceAfterVat) : null;
  if (d.sizeSmall !== undefined) updates.sizeSmall = d.sizeSmall;
  if (d.sizeMedium !== undefined) updates.sizeMedium = d.sizeMedium;
  if (d.sizeLarge !== undefined) updates.sizeLarge = d.sizeLarge;
  if (d.weightOrAmount !== undefined) updates.weightOrAmount = d.weightOrAmount;
  if (d.productNotes !== undefined) updates.productNotes = d.productNotes;

  const [updated] = await db
    .update(productsTable)
    .set(updates)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(serializeProduct(updated));
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
