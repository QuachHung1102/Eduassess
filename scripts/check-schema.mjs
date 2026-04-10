import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Check what columns exist on key tables
const tables = ["flashcard_sets", "flashcard_cards", "flashcard_sessions", "exams", "users", "password_reset_tokens"];
for (const table of tables) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  console.log(`\n=== ${table} ===`);
  rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable}, default: ${r.column_default})`));
}

await client.end();
