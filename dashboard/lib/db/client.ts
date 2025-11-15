import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from './schema';

// Ensure data directory exists (server-side only)
let dbPath: string;
if (typeof window === 'undefined') {
  // Server-side only: webpack will exclude this from client bundles
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'thesis.db');
} else {
  // This should never execute in browser, but provide a fallback for type safety
  throw new Error('Database client cannot be used in browser environment');
}

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Export the raw SQLite instance for advanced queries if needed
export { sqlite };

