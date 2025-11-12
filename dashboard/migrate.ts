import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './lib/db/client';
import path from 'path';

async function runMigrations() {
  try {
    console.log('Running migrations...');
    
    migrate(db, {
      migrationsFolder: path.join(process.cwd(), 'drizzle', 'migrations'),
    });
    
    console.log('✓ Migrations completed successfully');
    sqlite.close();
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();

