/**
 * Migration Validation Script
 * 
 * This script validates the URL processing status migration by:
 * 1. Running validation queries
 * 2. Checking data integrity
 * 3. Generating a report
 * 
 * Run this AFTER applying the migration to verify success.
 * 
 * Usage:
 *   pnpm tsx scripts/validate-migration.ts
 */

import { db, sqlite } from '../lib/db/client';
import { urls } from '../drizzle/schema';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  check: string;
  passed: boolean;
  expected: number | string;
  actual: number | string;
  details?: string;
}

const results: ValidationResult[] = [];

async function runValidation() {
  console.log('🔍 Starting migration validation...\n');

  // ============================================
  // Pre-Check: Verify migration has been applied
  // ============================================
  console.log('Pre-Check: Verifying migration has been applied...');
  
  try {
    // Try to query new columns
    sqlite.prepare('SELECT processing_status FROM urls LIMIT 1').get();
  } catch (error) {
    if ((error as any).message?.includes('no such column')) {
      console.log('\n' + '='.repeat(70));
      console.log('⚠️  MIGRATION NOT YET APPLIED');
      console.log('='.repeat(70));
      console.log('\nThe new columns do not exist in the database yet.');
      console.log('This means migration 0014_add_processing_status has not been run.\n');
      console.log('Please run the migration first:');
      console.log('  1. Backup database: cp data/thesis.db data/thesis_backup.db');
      console.log('  2. Apply migration: pnpm drizzle-kit migrate');
      console.log('  3. Then run this validation again\n');
      console.log('Or follow the complete guide in: MIGRATION_CHECKLIST.md');
      console.log('='.repeat(70) + '\n');
      process.exit(1);
    }
    throw error;
  }
  
  console.log('  ✅ Migration columns detected\n');

  // ============================================
  // Check 1: All processing_status values are valid
  // ============================================
  console.log('Check 1: Validating processing_status values...');
  const invalidStatusCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(urls)
    .where(
      sql`processing_status NOT IN (
        'not_started', 'processing_zotero', 'processing_content', 
        'processing_llm', 'awaiting_selection', 'awaiting_metadata',
        'stored', 'stored_incomplete', 'stored_custom', 'exhausted',
        'ignored', 'archived'
      )`
    );

  results.push({
    check: 'All processing_status values are valid',
    passed: invalidStatusCount[0].count === 0,
    expected: 0,
    actual: invalidStatusCount[0].count,
  });

  // ============================================
  // Check 2: All stored URLs have link records
  // ============================================
  console.log('Check 2: Validating zotero_item_links...');
  const missingLinksResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM urls 
    WHERE processing_status LIKE 'stored%' 
      AND zotero_item_key IS NOT NULL
      AND id NOT IN (SELECT url_id FROM zotero_item_links)
  `).get() as { count: number };

  results.push({
    check: 'All stored URLs have link records',
    passed: missingLinksResult.count === 0,
    expected: 0,
    actual: missingLinksResult.count,
  });

  // ============================================
  // Check 3: Processing history is valid JSON
  // ============================================
  console.log('Check 3: Validating processing_history JSON...');
  const invalidJsonResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM urls
    WHERE processing_history IS NOT NULL
      AND json_valid(processing_history) = 0
  `).get() as { count: number };

  results.push({
    check: 'Processing history is valid JSON',
    passed: invalidJsonResult.count === 0,
    expected: 0,
    actual: invalidJsonResult.count,
  });

  // ============================================
  // Check 4: Link counts are accurate
  // ============================================
  console.log('Check 4: Validating linked_url_count...');
  const incorrectCountsResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT 
        u.id,
        u.linked_url_count,
        COUNT(zil.id) as actual_count
      FROM urls u
      LEFT JOIN zotero_item_links zil ON u.zotero_item_key = zil.item_key
      WHERE u.zotero_item_key IS NOT NULL
      GROUP BY u.id
      HAVING u.linked_url_count != actual_count
    )
  `).get() as { count: number };

  results.push({
    check: 'Link counts are accurate',
    passed: incorrectCountsResult.count === 0,
    expected: 0,
    actual: incorrectCountsResult.count,
  });

  // ============================================
  // Check 5: User intent values are valid
  // ============================================
  console.log('Check 5: Validating user_intent values...');
  const invalidIntentResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM urls
    WHERE user_intent NOT IN ('auto', 'ignore', 'priority', 'manual_only', 'archive')
  `).get() as { count: number };

  results.push({
    check: 'All user_intent values are valid',
    passed: invalidIntentResult.count === 0,
    expected: 0,
    actual: invalidIntentResult.count,
  });

  // ============================================
  // Check 6: Processing attempts are reasonable
  // ============================================
  console.log('Check 6: Validating processing_attempts...');
  const negativeAttemptsResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM urls
    WHERE processing_attempts < 0
  `).get() as { count: number };

  results.push({
    check: 'No negative processing attempts',
    passed: negativeAttemptsResult.count === 0,
    expected: 0,
    actual: negativeAttemptsResult.count,
  });

  // ============================================
  // Summary Statistics
  // ============================================
  console.log('\n📊 Generating summary statistics...');
  
  const statusDistribution = sqlite.prepare(`
    SELECT 
      processing_status,
      COUNT(*) as count
    FROM urls
    GROUP BY processing_status
    ORDER BY count DESC
  `).all() as Array<{ processing_status: string; count: number }>;

  const intentDistribution = sqlite.prepare(`
    SELECT 
      user_intent,
      COUNT(*) as count
    FROM urls
    GROUP BY user_intent
    ORDER BY count DESC
  `).all() as Array<{ user_intent: string; count: number }>;

  const totalUrlsResult = sqlite.prepare('SELECT COUNT(*) as count FROM urls').get() as { count: number };
  const totalLinksResult = sqlite.prepare('SELECT COUNT(*) as count FROM zotero_item_links').get() as { count: number };
  const urlsWithHistoryResult = sqlite.prepare(`
    SELECT COUNT(*) as count FROM urls WHERE processing_history IS NOT NULL
  `).get() as { count: number };

  // ============================================
  // Print Results
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 MIGRATION VALIDATION REPORT');
  console.log('='.repeat(70) + '\n');

  console.log('Validation Checks:');
  console.log('-'.repeat(70));
  
  let allPassed = true;
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.check}`);
    console.log(`   Expected: ${result.expected}, Actual: ${result.actual}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    if (!result.passed) {
      allPassed = false;
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('📈 Summary Statistics:');
  console.log('-'.repeat(70));
  console.log(`Total URLs: ${totalUrlsResult.count}`);
  console.log(`Total Zotero Links: ${totalLinksResult.count}`);
  console.log(`URLs with Processing History: ${urlsWithHistoryResult.count}`);

  console.log('\nProcessing Status Distribution:');
  statusDistribution.forEach((row) => {
    const percentage = ((row.count / totalUrlsResult.count) * 100).toFixed(1);
    console.log(`  ${row.processing_status}: ${row.count} (${percentage}%)`);
  });

  console.log('\nUser Intent Distribution:');
  intentDistribution.forEach((row) => {
    const percentage = ((row.count / totalUrlsResult.count) * 100).toFixed(1);
    console.log(`  ${row.user_intent}: ${row.count} (${percentage}%)`);
  });

  console.log('\n' + '='.repeat(70));
  
  if (allPassed) {
    console.log('✅ ALL VALIDATION CHECKS PASSED!');
    console.log('Migration completed successfully.');
  } else {
    console.log('❌ SOME VALIDATION CHECKS FAILED!');
    console.log('Please review the failures above and consider rollback if necessary.');
  }
  
  console.log('='.repeat(70) + '\n');

  process.exit(allPassed ? 0 : 1);
}

// Run validation
runValidation().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});

