import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use external PostgreSQL database
const DATABASE_URL = process.env.EXTERNAL_DB_URL || "postgresql://postgres:ss123456@103.122.85.61:9095/DebtorStream_Database";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: false  // Disable SSL for local PostgreSQL connection
});

export const db = drizzle(pool, { schema });
