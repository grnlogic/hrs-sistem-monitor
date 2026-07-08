import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let db: Database | null = null;

function ensureDataDir(dbPath: string) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): Database {
  if (db) return db;

  const dbPath = path.join(process.cwd(), "data", "padud-system.db");
  ensureDataDir(dbPath);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pkb_templates (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  return db;
}
