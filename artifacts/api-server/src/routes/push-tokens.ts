import { Router } from "express";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db";

const router = Router();

router.post("/push-tokens", async (req, res) => {
  const { token } = req.body as { token?: unknown };
  if (typeof token !== "string" || token.trim().length === 0) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  await db
    .insert(pushTokensTable)
    .values({ token: token.trim() })
    .onConflictDoNothing({ target: pushTokensTable.token });

  res.status(201).json({ ok: true });
});

export default router;
