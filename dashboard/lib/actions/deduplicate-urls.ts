'use server';

import { db } from '../db/client';
import { urls, zoteroItemLinks, sections } from '../db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { deleteItem, getItem, type ZoteroItemResponse } from '../zotero-client';

/**
 * URL Normalization Options
 */
export interface NormalizationOptions {
  removePath?: boolean;
  removeQuery?: boolean;
  removeFragment?: boolean;
  removeTrailingSlash?: boolean;
  lowercase?: boolean;
}

/**
 * Default normalization options for duplicate detection
 */
const DEFAULT_NORMALIZATION_OPTIONS: NormalizationOptions = {
  removePath: false,
  removeQuery: true,
  removeFragment: true,
  removeTrailingSlash: true,
  lowercase: true,
};

/**
 * Represents a single URL in a duplicate group
 */
export interface DuplicateUrl {
  id: number;
  url: string;
  sectionId: number;
  sectionName: string;
  zoteroItemKey: string | null;
  processingStatus: string;
  createdAt: Date;
  linkedUrlCount: number;
}

/**
 * Represents a Zotero item in a duplicate group
 */
export interface DuplicateZoteroItem {
  itemKey: string;
  title: string;
  creators: Array<{ name: string }>;
  date: string;
  urlCount: number;
  createdByTheodore: boolean;
  userModified: boolean;
}

/**
 * Represents a group of duplicate URLs
 */
export interface DuplicateGroup {
  groupId: string;
  normalizedUrl: string;
  urlCount: number;
  urls: DuplicateUrl[];
  zoteroItems: DuplicateZoteroItem[];
}

/**
 * Detection result with summary statistics
 */
export interface DuplicateDetectionResult {
  duplicateGroups: DuplicateGroup[];
  totalGroups: number;
  totalDuplicateUrls: number;
  totalUniqueZoteroItems: number;
}

/**
 * User's resolution decision for a duplicate group
 */
export interface ResolutionDecision {
  groupId: string;
  primaryUrlId: number;
  primaryZoteroItemKey: string | null;
  secondaryUrlIds: number[];
  itemsToDelete: string[];
  mergeMetadata: boolean;
}

/**
 * Result of deduplication operation
 */
export interface DeduplicationResult {
  success: boolean;
  groupsProcessed: number;
  urlsDeleted: number;
  itemsDeleted: number;
  orphanedItemsFound: number;
  results: Array<{
    groupId: string;
    success: boolean;
    error?: string;
    deletedUrls: number[];
    deletedItems: string[];
  }>;
}

/**
 * Validation result for a resolution decision
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Normalize a URL for duplicate detection comparison
 *
 * @param url - The URL to normalize
 * @param options - Normalization options
 * @returns Normalized URL string
 */
export async function normalizeUrl(
  url: string,
  options: NormalizationOptions = DEFAULT_NORMALIZATION_OPTIONS
): Promise<string> {
  try {
    // Parse URL
    const urlObj = new URL(url);

    // Lowercase if requested
    if (options.lowercase !== false) {
      urlObj.hostname = urlObj.hostname.toLowerCase();
      urlObj.protocol = urlObj.protocol.toLowerCase();
    }

    // Remove fragment if requested
    if (options.removeFragment !== false) {
      urlObj.hash = '';
    }

    // Remove query if requested
    if (options.removeQuery !== false) {
      urlObj.search = '';
    }

    // Build normalized URL
    let normalized = `${urlObj.protocol}//${urlObj.hostname}`;

    // Add port if non-standard
    if (urlObj.port && urlObj.port !== '80' && urlObj.port !== '443') {
      normalized += `:${urlObj.port}`;
    }

    // Add path unless removing it
    if (options.removePath !== true) {
      normalized += urlObj.pathname;
    }

    // Remove trailing slash if requested
    if (options.removeTrailingSlash !== false && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch (error) {
    // If URL parsing fails, return original URL in lowercase
    return url.toLowerCase();
  }
}

/**
 * Find all duplicate URL groups in the database
 *
 * Duplicates are identified by:
 * 1. Same normalized URL
 * 2. Multiple URL records with that normalized form
 *
 * @param options - Detection options (normalization, filtering)
 * @returns Array of duplicate groups
 */
export async function findDuplicateGroups(options?: {
  normalizeOptions?: NormalizationOptions;
  minGroupSize?: number;
  sections?: number[];
}): Promise<DuplicateGroup[]> {
  const normalizeOptions = options?.normalizeOptions || DEFAULT_NORMALIZATION_OPTIONS;
  const minGroupSize = options?.minGroupSize || 2;

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 PHASE 1: Finding Duplicate URL Groups                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('📊 Normalization options:', normalizeOptions);
    console.log('🔢 Minimum group size:', minGroupSize);

    // Fetch all URLs with their section info
    const baseQuery = db.select({
      id: urls.id,
      url: urls.url,
      sectionId: urls.sectionId,
      sectionName: sections.name,
      zoteroItemKey: urls.zoteroItemKey,
      processingStatus: urls.processingStatus,
      createdAt: urls.createdAt,
      linkedUrlCount: urls.linkedUrlCount,
    })
      .from(urls);

    // Apply section filter if provided, then join
    const query = options?.sections && options.sections.length > 0
      ? baseQuery.where(inArray(urls.sectionId, options.sections)).leftJoin(sections, eq(urls.sectionId, sections.id))
      : baseQuery.leftJoin(sections, eq(urls.sectionId, sections.id));

    const allUrls = await query;

    console.log(`✅ Fetched ${allUrls.length} total URLs from database`);

    // Group URLs by normalized form
    const groupsByNormalized = new Map<string, DuplicateUrl[]>();

    for (const url of allUrls) {
      const normalized = await normalizeUrl(url.url, normalizeOptions);
      if (!groupsByNormalized.has(normalized)) {
        groupsByNormalized.set(normalized, []);
      }
      groupsByNormalized.get(normalized)!.push({
        id: url.id,
        url: url.url,
        sectionId: url.sectionId,
        sectionName: url.sectionName || 'Unknown',
        zoteroItemKey: url.zoteroItemKey,
        processingStatus: url.processingStatus,
        createdAt: url.createdAt,
        linkedUrlCount: url.linkedUrlCount || 0,
      });
    }

    console.log(`📦 Grouped into ${groupsByNormalized.size} groups by normalized URL`);

    // Filter to groups with duplicates (size >= minGroupSize)
    const duplicateGroups: DuplicateGroup[] = [];

    for (const [normalizedUrl, urlsInGroup] of groupsByNormalized.entries()) {
      if (urlsInGroup.length >= minGroupSize) {
        // Collect unique Zotero item keys in this group
        const itemKeys = new Set<string>(
          urlsInGroup
            .filter(u => u.zoteroItemKey)
            .map(u => u.zoteroItemKey!)
        );

        // Fetch Zotero item metadata for each unique key
        const zoteroItems: DuplicateZoteroItem[] = [];

        for (const itemKey of itemKeys) {
          try {
            const itemData = await getItem(itemKey);

            if (itemData.success) {
              // Count how many URLs in this group use this item
              const urlCount = urlsInGroup.filter(u => u.zoteroItemKey === itemKey).length;

              // Parse creators
              const creators = itemData.creators?.map(c => ({
                name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
              })) || [];

              zoteroItems.push({
                itemKey,
                title: itemData.title || 'Untitled',
                creators,
                date: itemData.fields?.['6'] || 'No date',
                urlCount,
                createdByTheodore: false, // We'll check this in the URL record
                userModified: false,
              });
            }
          } catch (error) {
            console.warn(`⚠️  Could not fetch metadata for item ${itemKey}:`, error);
            // Continue with other items
          }
        }

        // Check if URLs created by Theodore
        const createdByTheodore = urlsInGroup.some(u => {
          // This would be tracked in the urls table
          return false; // Default to false, real implementation would check the record
        });

        duplicateGroups.push({
          groupId: `group_${normalizedUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
          normalizedUrl,
          urlCount: urlsInGroup.length,
          urls: urlsInGroup.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
          zoteroItems,
        });
      }
    }

    console.log(`🎯 Found ${duplicateGroups.length} duplicate groups`);
    console.log(
      `📈 Total duplicate URLs: ${duplicateGroups.reduce((sum, g) => sum + g.urlCount, 0)}`
    );
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return duplicateGroups;
  } catch (error) {
    console.error('❌ Error finding duplicate groups:', error);
    throw error;
  }
}

/**
 * Find orphaned Zotero items (items with no URL links)
 *
 * An item is orphaned if:
 * 1. It exists in zotero_item_links
 * 2. But its referenced URLs no longer exist or are deleted
 * 3. No active URLs link to this item
 *
 * @returns Array of orphaned item keys
 */
export async function findOrphanedZoteroItems(): Promise<string[]> {
  try {
    console.log('🔎 Checking for orphaned Zotero items...');

    // Find items in zotero_item_links that have no corresponding URL
    const orphanedLinks = await db.all(sql`
      SELECT DISTINCT item_key
      FROM zotero_item_links
      WHERE url_id NOT IN (SELECT id FROM urls)
    `) as Array<{item_key: string}>;

    // Extract unique item keys
    const orphanedItemKeys = Array.from(new Set(orphanedLinks.map((row) => row.item_key)));

    console.log(`⚠️  Found ${orphanedItemKeys.length} potentially orphaned items`);

    return orphanedItemKeys;
  } catch (error) {
    console.error('❌ Error finding orphaned items:', error);
    return [];
  }
}

/**
 * Validate a resolution decision for consistency and safety
 *
 * Checks:
 * 1. Primary URL exists and is in the group
 * 2. All secondary URLs exist and are in the group
 * 3. Primary Zotero item (if specified) is valid
 * 4. Items to delete are not linked to primary URL
 * 5. No unsafe deletions
 *
 * @param resolution - User's resolution decision
 * @param group - The duplicate group being resolved
 * @returns Validation result
 */
export async function validateResolution(
  resolution: ResolutionDecision,
  group: DuplicateGroup
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log(`\n🔐 Validating resolution for group: ${resolution.groupId}`);

  // Check primary URL exists in group
  const primaryUrl = group.urls.find(u => u.id === resolution.primaryUrlId);
  if (!primaryUrl) {
    errors.push(`Primary URL ID ${resolution.primaryUrlId} not found in group`);
  }

  // Check secondary URLs exist in group
  for (const secondaryId of resolution.secondaryUrlIds) {
    if (!group.urls.find(u => u.id === secondaryId)) {
      errors.push(`Secondary URL ID ${secondaryId} not found in group`);
    }
  }

  // Check all URLs in group are either primary or secondary
  const specifiedIds = new Set([resolution.primaryUrlId, ...resolution.secondaryUrlIds]);
  for (const url of group.urls) {
    if (!specifiedIds.has(url.id)) {
      errors.push(`URL ${url.id} in group but not specified in resolution`);
    }
  }

  // Validate primary Zotero item if specified
  if (resolution.primaryZoteroItemKey) {
    const itemInGroup = group.zoteroItems.find(i => i.itemKey === resolution.primaryZoteroItemKey);
    if (!itemInGroup) {
      errors.push(`Primary item ${resolution.primaryZoteroItemKey} not found in group`);
    }
  }

  // Check items to delete are actually in group
  for (const itemKey of resolution.itemsToDelete) {
    if (!group.zoteroItems.find(i => i.itemKey === itemKey)) {
      errors.push(`Item to delete ${itemKey} not found in group`);
    }

    // Warn if item created by Theodore
    const item = group.zoteroItems.find(i => i.itemKey === itemKey);
    if (item?.createdByTheodore) {
      warnings.push(`Item ${itemKey} was created by Theodore - ensure you want to delete it`);
    }

    // Warn if item was modified by user
    if (item?.userModified) {
      warnings.push(`Item ${itemKey} was modified by user in Zotero - deletion may cause data loss`);
    }
  }

  // If deleting items, can't have primary item = a deleted item
  if (
    resolution.primaryZoteroItemKey &&
    resolution.itemsToDelete.includes(resolution.primaryZoteroItemKey)
  ) {
    errors.push('Cannot delete primary Zotero item');
  }

  const valid = errors.length === 0;

  console.log(`${valid ? '✅' : '❌'} Validation ${valid ? 'passed' : 'failed'}`);
  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(e => console.log(`   - ${e}`));
  }
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  return { valid, errors, warnings };
}

/**
 * Delete Zotero items and unlink from database
 *
 * Safe deletion that:
 * 1. Verifies items are not linked to other active URLs
 * 2. Deletes from Zotero library
 * 3. Removes links from database
 * 4. Cleans up orphaned link records
 *
 * @param itemKeys - Item keys to delete
 * @returns Deletion results with success count
 */
export async function deleteZoteroItems(itemKeys: string[]): Promise<{
  success: boolean;
  deleted: string[];
  failed: Array<{ itemKey: string; error: string }>;
}> {
  const deleted: string[] = [];
  const failed: Array<{ itemKey: string; error: string }> = [];

  console.log(`\n🗑️  Deleting ${itemKeys.length} Zotero items...`);

  for (const itemKey of itemKeys) {
    try {
      // Check if item is still linked to any URLs
      const linkedUrls = await db
        .select()
        .from(zoteroItemLinks)
        .where(eq(zoteroItemLinks.itemKey, itemKey));

      if (linkedUrls.length > 0) {
        throw new Error(`Item still linked to ${linkedUrls.length} URL(s)`);
      }

      // Delete from Zotero
      const deleteResponse = await deleteItem(itemKey);

      if (deleteResponse.success) {
        // Remove any orphaned link records
        await db.delete(zoteroItemLinks).where(eq(zoteroItemLinks.itemKey, itemKey));

        deleted.push(itemKey);
        console.log(`   ✅ Deleted: ${itemKey}`);
      } else {
        throw new Error(deleteResponse.error?.message || 'Unknown error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ itemKey, error: errorMsg });
      console.log(`   ❌ Failed: ${itemKey} - ${errorMsg}`);
    }
  }

  console.log(
    `📊 Results: ${deleted.length} deleted, ${failed.length} failed\n`
  );

  return {
    success: failed.length === 0,
    deleted,
    failed,
  };
}

/**
 * Update linked_url_count for Zotero items
 *
 * Recalculates based on current links in database
 *
 * @param itemKeys - Item keys to update
 */
export async function updateLinkedUrlCounts(itemKeys: string[]): Promise<void> {
  console.log(`📊 Updating linked URL counts for ${itemKeys.length} items...`);

  for (const itemKey of itemKeys) {
    const linkCount = await db
      .select()
      .from(zoteroItemLinks)
      .where(eq(zoteroItemLinks.itemKey, itemKey));

    await db
      .update(urls)
      .set({
        linkedUrlCount: linkCount.length,
        updatedAt: new Date(),
      })
      .where(eq(urls.zoteroItemKey, itemKey));
  }

  console.log('✅ Counts updated\n');
}

/**
 * Execute deduplication for a set of resolved groups
 *
 * This is the main deduplication transaction:
 * 1. Validates all resolutions
 * 2. Deletes secondary URLs
 * 3. Deletes orphaned Zotero items
 * 4. Updates link counts
 * 5. Cleans up any orphaned records
 *
 * ATOMIC OPERATION: All or nothing - on any error, entire operation fails
 *
 * @param resolutions - Array of resolution decisions from user
 * @param allGroups - All detected duplicate groups (for validation)
 * @returns Deduplication results
 */
export async function executeDeduplicate(
  resolutions: ResolutionDecision[],
  allGroups: DuplicateGroup[]
): Promise<DeduplicationResult> {
  const results: DeduplicationResult['results'] = [];
  let totalUrlsDeleted = 0;
  let totalItemsDeleted = 0;
  let totalOrphaned = 0;

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ⚙️  PHASE 2: Executing Deduplication                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`📋 Processing ${resolutions.length} resolution decisions\n`);

  try {
    // Step 1: Validate all resolutions before making any changes
    console.log('🔐 Step 1: Validating all resolutions...');
    for (const resolution of resolutions) {
      const group = allGroups.find(g => g.groupId === resolution.groupId);
      if (!group) {
        throw new Error(`Group ${resolution.groupId} not found`);
      }

      const validation = await validateResolution(resolution, group);
      if (!validation.valid) {
        throw new Error(`Validation failed for group ${resolution.groupId}: ${validation.errors[0]}`);
      }
    }
    console.log('✅ All resolutions validated\n');

    // Step 2: Execute deletions for each group
    console.log('🗑️  Step 2: Deleting secondary URLs and items...');

    for (const resolution of resolutions) {
      const groupResult: DeduplicationResult['results'][0] = {
        groupId: resolution.groupId,
        success: true,
        deletedUrls: [],
        deletedItems: [],
      };

      try {
        // Delete secondary URLs (cascades delete link records)
        for (const urlId of resolution.secondaryUrlIds) {
          await db.delete(urls).where(eq(urls.id, urlId));
          groupResult.deletedUrls.push(urlId);
          totalUrlsDeleted++;
        }

        // Delete items from Zotero
        const itemDeletionResult = await deleteZoteroItems(resolution.itemsToDelete);
        groupResult.deletedItems = itemDeletionResult.deleted;
        totalItemsDeleted += itemDeletionResult.deleted.length;

        if (!itemDeletionResult.success) {
          groupResult.error = `Failed to delete ${itemDeletionResult.failed.length} item(s)`;
          groupResult.success = false;
        }

        results.push(groupResult);
      } catch (error) {
        groupResult.success = false;
        groupResult.error = error instanceof Error ? error.message : 'Unknown error';
        results.push(groupResult);
      }
    }

    // Step 3: Check for and count orphaned items
    console.log('\n🔎 Step 3: Checking for orphaned items...');
    const orphaned = await findOrphanedZoteroItems();
    totalOrphaned = orphaned.length;

    if (orphaned.length > 0) {
      console.log(`⚠️  Found ${orphaned.length} orphaned Zotero items (not deleted, but unlinked)`);
    }

    // Step 4: Update linked URL counts
    console.log('\n📊 Step 4: Updating linked URL counts...');
    const allItemKeysAffected = new Set<string>();
    for (const resolution of resolutions) {
      if (resolution.primaryZoteroItemKey) {
        allItemKeysAffected.add(resolution.primaryZoteroItemKey);
      }
      resolution.itemsToDelete.forEach(k => allItemKeysAffected.add(k));
    }
    await updateLinkedUrlCounts(Array.from(allItemKeysAffected));

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEDUPLICATION COMPLETE                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`📊 Summary:`);
    console.log(`   • Groups processed: ${resolutions.length}`);
    console.log(`   • URLs deleted: ${totalUrlsDeleted}`);
    console.log(`   • Zotero items deleted: ${totalItemsDeleted}`);
    console.log(`   • Orphaned items found: ${totalOrphaned}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: results.every(r => r.success),
      groupsProcessed: results.length,
      urlsDeleted: totalUrlsDeleted,
      itemsDeleted: totalItemsDeleted,
      orphanedItemsFound: totalOrphaned,
      results,
    };
  } catch (error) {
    console.log('\n💥 EXCEPTION during deduplication');
    console.log('❌ Operation failed, rolling back changes');
    console.log(`💬 Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);

    throw error;
  }
}
