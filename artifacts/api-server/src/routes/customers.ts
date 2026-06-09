import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerParams,
  DeleteCustomerParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/customers", async (req, res) => {
  const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
  res.json(customers);
});

router.post("/customers", async (req, res) => {
  const body = CreateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [newCustomer] = await db
    .insert(customersTable)
    .values({
      businessName: body.data.businessName,
      contactName: body.data.contactName ?? null,
      phone: body.data.phone ?? null,
      email: body.data.email ?? null,
      companyId: body.data.companyId ?? null,
      deliveryAddress: body.data.deliveryAddress ?? null,
    })
    .returning();
  res.status(201).json(newCustomer);
});

router.put("/customers/:id", async (req, res) => {
  const params = UpdateCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = UpdateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [updated] = await db
    .update(customersTable)
    .set({
      businessName: body.data.businessName,
      contactName: body.data.contactName ?? null,
      phone: body.data.phone ?? null,
      email: body.data.email ?? null,
      companyId: body.data.companyId ?? null,
      deliveryAddress: body.data.deliveryAddress ?? null,
    })
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(updated);
});

router.delete("/customers/:id", async (req, res) => {
  const params = DeleteCustomerParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [deleted] = await db
    .delete(customersTable)
    .where(eq(customersTable.id, params.data.id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.status(204).send();
});

export default router;
