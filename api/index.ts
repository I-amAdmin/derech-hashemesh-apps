import app from "../artifacts/api-server/src/app";
import { runMigrations } from "../lib/db/src/migrate";
import type { IncomingMessage, ServerResponse } from "http";

let migrationPromise: Promise<void> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  await migrationPromise;
  app(req as any, res as any);
}
