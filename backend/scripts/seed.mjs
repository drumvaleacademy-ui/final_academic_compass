import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const args = process.argv.slice(2);
const dumpPath = args[0] || path.join(process.cwd(), "data", "seed.json");
const dbPath = args[1] || path.join(process.cwd(), "data", "academic-compass.sqlite");

if (!fs.existsSync(dumpPath)) {
  console.error(`Seed file not found: ${dumpPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(dumpPath, "utf8");
const dump = JSON.parse(raw);

const dir = path.dirname(dbPath);
fs.mkdirSync(dir, { recursive: true });

if (fs.existsSync(dbPath)) {
  fs.rmSync(dbPath);
}

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

const schema = fs.readFileSync(path.join(process.cwd(), "data", "schema.sql"), "utf8");
db.exec(schema);

const tables = ["ac_profiles", "ac_user_roles", "ac_mark_entries", "ac_timetable_slots"];

for (const table of tables) {
  const rows = dump[table];
  if (!rows || !rows.length) continue;

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(",");
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  for (const row of rows) {
    const values = columns.map((col) => {
      const val = row[col];
      return val === undefined ? null : val;
    });
    stmt.run(...values);
  }

  console.log(`Seeded ${table}: ${rows.length} rows`);
}

console.log(`Database initialized at: ${dbPath}`);
