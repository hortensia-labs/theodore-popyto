import { defineConfig } from 'drizzle-kit';
import path from 'path';

export default defineConfig({
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(process.cwd(), 'data', 'thesis.db'),
  },
  verbose: true,
  strict: true,
});

