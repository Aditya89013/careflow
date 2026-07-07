/**
 * run_attendance_migration.ts
 * Applies the attendance integration schema to the CareFlow PostgreSQL database.
 * Usage: npx ts-node run_attendance_migration.ts
 */

import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in .env");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const MIGRATION_FILE = path.join(__dirname, "platforms", "attendance_migration.sql");

async function runMigration() {
  console.log("🏥 CareFlow — Attendance Integration Migration");
  console.log("━".repeat(50));

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error("❌ Migration file not found:", MIGRATION_FILE);
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, "utf8");
  const client = await pool.connect();

  try {
    console.log("📂 Applying attendance_migration.sql …");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Migration applied successfully.");
    console.log("\nTables created/verified:");
    const tables = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('attendance_connectors','attendance_devices','attendance_events') ORDER BY tablename`
    );
    tables.rows.forEach(r => console.log(`  ✓ ${r.tablename}`));
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ Migration FAILED:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
