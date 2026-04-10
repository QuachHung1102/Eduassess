import pg from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at"
);
console.log(JSON.stringify(rows, null, 2));
await client.end();
