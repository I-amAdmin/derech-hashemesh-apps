import { Router } from "express";

const router = Router();

const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  throw new Error("ADMIN_PASSWORD environment variable is required but not set");
}

router.post("/auth/login", (req, res) => {
  const { password } = req.body as { password?: unknown };

  if (typeof password !== "string" || password.trim().length === 0) {
    res.status(400).json({ error: "Password required" });
    return;
  }

  if (password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  req.session!.authenticated = true;
  res.json({ ok: true });
});

router.post("/auth/logout", (req, res) => {
  req.session!.authenticated = false;
  req.session!.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res) => {
  res.json({ authenticated: req.session?.authenticated === true });
});

export default router;
