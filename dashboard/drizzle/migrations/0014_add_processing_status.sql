-- ============================================
-- MIGRATION: URL Processing System Refactor
-- Version: 1.0
-- Date: 2025-11-14
-- Description: Add new processing status system, user intent, and processing history tracking
-- ============================================

-- This migration adds:
-- 1. New columns to urls table for enhanced status tracking
-- 2. New zotero_item_links table for safe Zotero item management
-- 3. Indexes for performance
-- 4. Data migration from old status system to new
-- 5. Processing history reconstruction from existing data

BEGIN TRANSACTION;

-- ============================================
-- STEP 1: Add new columns to urls table
-- ============================================

-- Processing status (replaces computed status)
ALTER TABLE urls ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'not_started'
  CHECK (processing_status IN (
    'not_started',
    'processing_zotero',
    'processing_content',
    'processing_llm',
    'awaiting_selection',
    'awaiting_metadata',
    'stored',
    'stored_incomplete',
    'stored_custom',
    'exhausted',
    'ignored',
    'archived'
  ));

-- User intent (user-controlled status)
ALTER TABLE urls ADD COLUMN user_intent TEXT NOT NULL DEFAULT 'auto'
  CHECK (user_intent IN ('auto', 'ignore', 'priority', 'manual_only', 'archive'));

-- Processing tracking
ALTER TABLE urls ADD COLUMN processing_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE urls ADD COLUMN processing_history TEXT; -- JSON array of ProcessingAttempt
ALTER TABLE urls ADD COLUMN last_processing_method TEXT;

-- Zotero item provenance tracking
ALTER TABLE urls ADD COLUMN created_by_theodore INTEGER DEFAULT 0; -- boolean
ALTER TABLE urls ADD COLUMN user_modified_in_zotero INTEGER DEFAULT 0; -- boolean
ALTER TABLE urls ADD COLUMN linked_url_count INTEGER DEFAULT 0; -- denormalized count

-- ============================================
-- STEP 2: Create zotero_item_links table
-- ============================================

CREATE TABLE IF NOT EXISTS zotero_item_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL,
  url_id INTEGER NOT NULL,
  created_by_theodore INTEGER NOT NULL DEFAULT 1,
  user_modified INTEGER NOT NULL DEFAULT 0,
  linked_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
  UNIQUE(item_key, url_id)
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

-- Indexes for urls table new columns
CREATE INDEX IF NOT EXISTS idx_urls_processing_status ON urls(processing_status);
CREATE INDEX IF NOT EXISTS idx_urls_user_intent ON urls(user_intent);
CREATE INDEX IF NOT EXISTS idx_urls_processing_attempts ON urls(processing_attempts);

-- Indexes for zotero_item_links table
CREATE INDEX IF NOT EXISTS idx_zotero_links_item_key ON zotero_item_links(item_key);
CREATE INDEX IF NOT EXISTS idx_zotero_links_url_id ON zotero_item_links(url_id);

-- ============================================
-- STEP 4: Migrate existing data
-- ============================================

-- Set processing_status based on existing zotero_processing_status
UPDATE urls
SET 
  processing_status = CASE
    -- Already stored with complete citation
    WHEN zotero_item_key IS NOT NULL 
         AND zotero_processing_status = 'stored' 
         AND citation_validation_status = 'valid'
    THEN 'stored'
    
    -- Stored but incomplete citation
    WHEN zotero_item_key IS NOT NULL 
         AND zotero_processing_status = 'stored' 
         AND citation_validation_status = 'incomplete'
    THEN 'stored_incomplete'
    
    -- Currently stored but not validated yet
    WHEN zotero_item_key IS NOT NULL 
         AND zotero_processing_status = 'stored' 
         AND citation_validation_status IS NULL
    THEN 'stored_incomplete'
    
    -- Failed processing - reset to not_started per requirements
    -- This allows auto-retry with new cascade system
    WHEN zotero_processing_status = 'failed'
    THEN 'not_started'
    
    -- Currently processing (unlikely but handle it)
    WHEN zotero_processing_status = 'processing'
    THEN 'processing_zotero'
    
    -- Default: not started
    ELSE 'not_started'
  END,
  
  -- Set processing_attempts based on whether processing was attempted
  processing_attempts = CASE
    WHEN zotero_processing_status IS NOT NULL THEN 1
    ELSE 0
  END,
  
  -- Set last_processing_method if we know it
  last_processing_method = CASE
    WHEN zotero_processing_method IS NOT NULL THEN zotero_processing_method
    ELSE NULL
  END,
  
  -- Mark as created by Theodore if we have a Zotero item key
  created_by_theodore = CASE
    WHEN zotero_item_key IS NOT NULL THEN 1
    ELSE 0
  END,
  
  -- Initialize linked_url_count to 1 for items with keys (will update later)
  linked_url_count = CASE
    WHEN zotero_item_key IS NOT NULL THEN 1
    ELSE 0
  END;

-- ============================================
-- STEP 5: Create link records for existing stored URLs
-- ============================================

INSERT INTO zotero_item_links (item_key, url_id, created_by_theodore, linked_at)
SELECT 
  zotero_item_key,
  id,
  1, -- All existing items assumed created by Theodore
  COALESCE(zotero_processed_at, created_at) -- Use processing time or creation time
FROM urls
WHERE zotero_item_key IS NOT NULL
  AND zotero_item_key != '';

-- ============================================
-- STEP 6: Build processing history from existing data
-- ============================================

-- Only create history for URLs that were actually processed
UPDATE urls
SET processing_history = json_array(
  json_object(
    'timestamp', CASE 
      WHEN zotero_processed_at IS NOT NULL 
      THEN unixepoch(zotero_processed_at) * 1000
      ELSE unixepoch(created_at) * 1000
    END,
    'stage', CASE zotero_processing_method
      WHEN 'identifier' THEN 'zotero_identifier'
      WHEN 'url' THEN 'zotero_url'
      ELSE 'zotero_identifier' -- Default assumption
    END,
    'success', CASE zotero_processing_status
      WHEN 'stored' THEN 1
      WHEN 'failed' THEN 0
      ELSE NULL
    END,
    'error', zotero_processing_error,
    'itemKey', zotero_item_key
  )
)
WHERE zotero_processing_status IS NOT NULL;

-- ============================================
-- STEP 7: Update linked_url_count for shared items
-- ============================================

-- Count how many URLs point to each Zotero item
UPDATE urls
SET linked_url_count = (
  SELECT COUNT(*)
  FROM zotero_item_links
  WHERE zotero_item_links.item_key = urls.zotero_item_key
)
WHERE zotero_item_key IS NOT NULL;

-- ============================================
-- STEP 8: Validation queries (run after migration)
-- ============================================

-- These queries should return 0 rows or expected counts
-- Run these manually after migration to verify success

-- Query 1: Check all processing_status values are valid
-- Expected: 0 rows
-- SELECT COUNT(*) as invalid_count FROM urls 
-- WHERE processing_status NOT IN (
--   'not_started', 'processing_zotero', 'processing_content', 
--   'processing_llm', 'awaiting_selection', 'awaiting_metadata',
--   'stored', 'stored_incomplete', 'stored_custom', 'exhausted',
--   'ignored', 'archived'
-- );

-- Query 2: Check all stored URLs have link records
-- Expected: 0 rows
-- SELECT COUNT(*) as missing_links FROM urls 
-- WHERE processing_status LIKE 'stored%' 
--   AND zotero_item_key IS NOT NULL
--   AND id NOT IN (SELECT url_id FROM zotero_item_links);

-- Query 3: Check processing history is valid JSON
-- Expected: 0 rows
-- SELECT COUNT(*) as invalid_json FROM urls
-- WHERE processing_history IS NOT NULL
--   AND json_valid(processing_history) = 0;

-- Query 4: Verify link counts are accurate
-- Expected: 0 rows (all counts should match)
-- SELECT 
--   u.id,
--   u.zotero_item_key,
--   u.linked_url_count,
--   COUNT(zil.id) as actual_count
-- FROM urls u
-- LEFT JOIN zotero_item_links zil ON u.zotero_item_key = zil.item_key
-- WHERE u.zotero_item_key IS NOT NULL
-- GROUP BY u.id
-- HAVING u.linked_url_count != actual_count;

-- Query 5: Summary statistics
-- Expected: Review for reasonableness
-- SELECT 
--   processing_status,
--   COUNT(*) as count
-- FROM urls
-- GROUP BY processing_status
-- ORDER BY count DESC;

COMMIT;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Next steps:
-- 1. Run validation queries above
-- 2. Verify counts make sense
-- 3. Test application with new schema
-- 4. If issues found, see ROLLBACK section below

