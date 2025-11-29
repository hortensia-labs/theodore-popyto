/**
 * URL Status Migration Script
 * 
 * This script helps with the migration from old status system to new.
 * It can be run in dry-run mode to preview changes or in execute mode
 * to apply fixes to data migration issues.
 * 
 * Usage:
 *   Dry run (preview):  pnpm tsx scripts/migrate-url-statuses.ts --dry-run
 *   Execute:            pnpm tsx scripts/migrate-url-statuses.ts --execute
 */

import { db, sqlite } from '../lib/db/client';
import { urls, zoteroItemLinks, type ProcessingAttempt } from '../drizzle/schema';
import { sql, eq } from 'drizzle-orm';

interface MigrationStats {
  totalUrls: number;
  migrated: {
    toStored: number;
    toStoredIncomplete: number;
    toNotStarted: number;
    unchanged: number;
  };
  linksCreated: number;
  historiesBuilt: number;
  errors: Array<{ urlId: number; error: string }>;
}

const stats: MigrationStats = {
  totalUrls: 0,
  migrated: {
    toStored: 0,
    toStoredIncomplete: 0,
    toNotStarted: 0,
    unchanged: 0,
  },
  linksCreated: 0,
  historiesBuilt: 0,
  errors: [],
};

const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log('🚀 Starting URL Status Migration...\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'EXECUTE (changes will be applied)'}\n`);

  // ============================================
  // Step 1: Count total URLs
  // ============================================
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(urls);
  stats.totalUrls = totalResult[0].count;
  console.log(`📊 Total URLs to process: ${stats.totalUrls}\n`);

  // ============================================
  // Step 2: Migrate processing statuses
  // ============================================
  console.log('Step 1: Migrating processing statuses...');
  
  // Get all URLs that need status migration
  const urlsToMigrate = await db.select().from(urls);
  
  for (const url of urlsToMigrate) {
    try {
      let newStatus: string | null = null;
      
      // Determine new status based on old fields
      if (url.zoteroItemKey && url.zoteroProcessingStatus === 'stored') {
        if (url.citationValidationStatus === 'valid') {
          newStatus = 'stored';
          stats.migrated.toStored++;
        } else {
          newStatus = 'stored_incomplete';
          stats.migrated.toStoredIncomplete++;
        }
      } else if (url.zoteroProcessingStatus === 'failed') {
        newStatus = 'not_started';
        stats.migrated.toNotStarted++;
      } else if (url.zoteroProcessingStatus === 'processing') {
        newStatus = 'processing_zotero';
      } else {
        stats.migrated.unchanged++;
      }
      
      if (newStatus && newStatus !== url.processingStatus) {
        if (!isDryRun) {
          await db.update(urls)
            .set({
              processingStatus: newStatus,
              processingAttempts: url.zoteroProcessingStatus ? 1 : 0,
              lastProcessingMethod: url.zoteroProcessingMethod || null,
              createdByTheodore: url.zoteroItemKey ? true : false,
              linkedUrlCount: url.zoteroItemKey ? 1 : 0,
              updatedAt: new Date(),
            })
            .where(eq(urls.id, url.id));
        }
      }
    } catch (error) {
      stats.errors.push({
        urlId: url.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  console.log(`  ✓ Migrated statuses: ${stats.migrated.toStored + stats.migrated.toStoredIncomplete + stats.migrated.toNotStarted} URLs`);

  // ============================================
  // Step 3: Create Zotero item links
  // ============================================
  console.log('\nStep 2: Creating Zotero item links...');
  
  const urlsWithZotero = await db.select().from(urls)
    .where(sql`zotero_item_key IS NOT NULL AND zotero_item_key != ''`);
  
  for (const url of urlsWithZotero) {
    try {
      if (!isDryRun) {
        // Check if link already exists
        const existing = await db.select().from(zoteroItemLinks)
          .where(eq(zoteroItemLinks.urlId, url.id))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(zoteroItemLinks).values({
            itemKey: url.zoteroItemKey!,
            urlId: url.id,
            createdByTheodore: true,
            userModified: false,
            linkedAt: url.zoteroProcessedAt || url.createdAt || new Date(),
          });
          stats.linksCreated++;
        }
      } else {
        stats.linksCreated++;
      }
    } catch (error) {
      stats.errors.push({
        urlId: url.id,
        error: `Failed to create link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
  
  console.log(`  ✓ Created ${stats.linksCreated} Zotero item links`);

  // ============================================
  // Step 4: Build processing histories
  // ============================================
  console.log('\nStep 3: Building processing histories...');
  
  const urlsWithProcessing = await db.select().from(urls)
    .where(sql`zotero_processing_status IS NOT NULL`);
  
  for (const url of urlsWithProcessing) {
    try {
      if (!url.processingHistory) {
        const history: ProcessingAttempt[] = [{
          timestamp: url.zoteroProcessedAt ? new Date(url.zoteroProcessedAt).getTime() : Date.now(),
          stage: url.zoteroProcessingMethod === 'identifier' ? 'zotero_identifier' : 'zotero_url',
          success: url.zoteroProcessingStatus === 'stored',
          error: url.zoteroProcessingError || undefined,
          itemKey: url.zoteroItemKey || undefined,
        }];
        
        if (!isDryRun) {
          await db.update(urls)
            .set({
              processingHistory: history,
              updatedAt: new Date(),
            })
            .where(eq(urls.id, url.id));
        }
        
        stats.historiesBuilt++;
      }
    } catch (error) {
      stats.errors.push({
        urlId: url.id,
        error: `Failed to build history: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
  
  console.log(`  ✓ Built ${stats.historiesBuilt} processing histories`);

  // ============================================
  // Step 5: Update linked_url_count
  // ============================================
  console.log('\nStep 4: Updating linked_url_count...');
  
  if (!isDryRun) {
    // Count links per item_key
    const linkCounts = sqlite.prepare(`
      SELECT item_key, COUNT(*) as count
      FROM zotero_item_links
      GROUP BY item_key
    `).all() as Array<{ item_key: string; count: number }>;
    
    for (const row of linkCounts) {
      const itemKey = row.item_key;
      const count = row.count;
      
      sqlite.prepare(`
        UPDATE urls
        SET linked_url_count = ?
        WHERE zotero_item_key = ?
      `).run(count, itemKey);
    }
  }
  
  console.log('  ✓ Updated linked_url_count for all items');

  // ============================================
  // Print Summary
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`\nTotal URLs processed: ${stats.totalUrls}`);
  console.log('\nStatus Migrations:');
  console.log(`  → stored: ${stats.migrated.toStored}`);
  console.log(`  → stored_incomplete: ${stats.migrated.toStoredIncomplete}`);
  console.log(`  → not_started (from failed): ${stats.migrated.toNotStarted}`);
  console.log(`  → unchanged: ${stats.migrated.unchanged}`);
  console.log(`\nZotero Links Created: ${stats.linksCreated}`);
  console.log(`Processing Histories Built: ${stats.historiesBuilt}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach((err, index) => {
      console.log(`  ${index + 1}. URL ${err.urlId}: ${err.error}`);
    });
  } else {
    console.log('\n✅ No errors encountered');
  }
  
  console.log('='.repeat(70));
  
  if (isDryRun) {
    console.log('\n📝 This was a DRY RUN - no changes were made to the database.');
    console.log('Run with --execute flag to apply changes.');
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('Please run validation script: pnpm tsx scripts/validate-migration.ts');
  }
  
  console.log('');
}

// Run migration
migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

