import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(path.join(DATA_DIR, "shizhi.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle({ client: sqlite, schema });
}

const globalForDb = globalThis as unknown as { __shizhiDb?: ReturnType<typeof createDb> };

export const db = globalForDb.__shizhiDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__shizhiDb = db;

export { schema };
