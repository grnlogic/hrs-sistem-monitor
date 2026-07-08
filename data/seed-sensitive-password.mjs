/**
 * Script seeder: generate bcrypt hash dari password sensitif
 * dan simpan ke tabel app_settings di SQLite.
 *
 * Jalankan sekali saja:
 *   node data/seed-sensitive-password.mjs
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const PASSWORD = "padudjayaputera";
const SALT_ROUNDS = 12;
const DB_PATH = path.join(__dirname, "padud-system.db");

async function seed() {
  console.log("🔐 Generating bcrypt hash untuk sensitive access password...");

  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  console.log("✅ Hash generated:", hash);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Pastikan tabel ada
  db.prepare(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Insert atau update hash
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run("sensitive_access_password_hash", hash);

  const row = db.prepare(`SELECT value, updated_at FROM app_settings WHERE key = ?`)
    .get("sensitive_access_password_hash");

  console.log("✅ Password hash tersimpan di database:");
  console.log("   Key  :", "sensitive_access_password_hash");
  console.log("   Hash :", row.value);
  console.log("   At   :", row.updated_at);

  db.close();
  console.log("\n🎉 Selesai. Password sensitif sudah tersimpan sebagai hash bcrypt.");
}

seed().catch((err) => {
  console.error("❌ Gagal:", err);
  process.exit(1);
});
