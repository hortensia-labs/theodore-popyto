-- ============================================
-- ROLLBACK: URL Processing System Refactor
-- Version: 1.0
-- Date: 2025-11-14
-- Description: Rollback migration 0014_add_processing_status.sql
-- ============================================

-- WARNING: This rollback will:
-- 1. Drop the zotero_item_links table
-- 2. Remove new columns from urls table (SQLite limitation: recreate table)
-- 3. Preserve all original data
-- 4. You will lose: processing_history, user_intent, new status tracking

-- BEFORE RUNNING THIS:
-- 1. Backup your database
-- 2. Ensure you have a copy of the current state
-- 3. Stop the application

BEGIN TRANSACTION;

-- ============================================
-- STEP 1: Drop new table
-- ============================================

DROP TABLE IF EXISTS zotero_item_links;

-- ============================================
-- STEP 2: Drop new indexes
-- ============================================

DROP INDEX IF EXISTS idx_urls_processing_status;
DROP INDEX IF EXISTS idx_urls_user_intent;
DROP INDEX IF EXISTS idx_urls_processing_attempts;
DROP INDEX IF EXISTS idx_zotero_links_item_key;
DROP INDEX IF EXISTS idx_zotero_links_url_id;

-- ============================================
-- STEP 3: Remove new columns from urls table
-- ============================================

-- SQLite doesn't support DROP COLUMN directly
-- We need to:
-- 1. Create a new table without the new columns
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table

-- Create temporary table with original schema (without new columns)
CREATE TABLE urls_rollback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  domain TEXT,
  status_code INTEGER,
  content_type TEXT,
  final_url TEXT,
  redirect_count INTEGER,
  is_accessible INTEGER DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 1,
  has_errors INTEGER NOT NULL DEFAULT 0,
  zotero_item_key TEXT,
  zotero_processed_at INTEGER,
  zotero_processing_status TEXT,
  zotero_processing_error TEXT,
  zotero_processing_method TEXT,
  citation_validation_status TEXT,
  citation_validated_at INTEGER,
  citation_validation_details TEXT,
  process_workflow_version TEXT,
  content_fetch_attempts INTEGER DEFAULT 0,
  last_fetch_error TEXT,
  identifier_count INTEGER DEFAULT 0,
  has_extracted_metadata INTEGER DEFAULT 0,
  llm_extraction_status TEXT,
  llm_extraction_provider TEXT,
  llm_extraction_attempts INTEGER DEFAULT 0,
  llm_extracted_at INTEGER,
  llm_extraction_error TEXT,
  discovered_at INTEGER,
  last_checked_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- Copy data from urls to urls_rollback (excluding new columns)
INSERT INTO urls_rollback (
  id, section_id, url, domain, status_code, content_type, final_url,
  redirect_count, is_accessible, success, has_errors,
  zotero_item_key, zotero_processed_at, zotero_processing_status,
  zotero_processing_error, zotero_processing_method,
  citation_validation_status, citation_validated_at, citation_validation_details,
  process_workflow_version, content_fetch_attempts, last_fetch_error,
  identifier_count, has_extracted_metadata,
  llm_extraction_status, llm_extraction_provider, llm_extraction_attempts,
  llm_extracted_at, llm_extraction_error,
  discovered_at, last_checked_at, created_at, updated_at
)
SELECT 
  id, section_id, url, domain, status_code, content_type, final_url,
  redirect_count, is_accessible, success, has_errors,
  zotero_item_key, zotero_processed_at, zotero_processing_status,
  zotero_processing_error, zotero_processing_method,
  citation_validation_status, citation_validated_at, citation_validation_details,
  process_workflow_version, content_fetch_attempts, last_fetch_error,
  identifier_count, has_extracted_metadata,
  llm_extraction_status, llm_extraction_provider, llm_extraction_attempts,
  llm_extracted_at, llm_extraction_error,
  discovered_at, last_checked_at, created_at, updated_at
FROM urls;

-- Drop old urls table
DROP TABLE urls;

-- Rename new table to urls
ALTER TABLE urls_rollback RENAME TO urls;

-- ============================================
-- STEP 4: Recreate original indexes
-- ============================================

CREATE INDEX idx_urls_section_id_idx ON urls(section_id);
CREATE INDEX idx_urls_domain_idx ON urls(domain);
CREATE INDEX idx_urls_status_code_idx ON urls(status_code);
CREATE INDEX idx_urls_is_accessible_idx ON urls(is_accessible);
CREATE INDEX idx_urls_zotero_item_key_idx ON urls(zotero_item_key);
CREATE INDEX idx_urls_zotero_processing_status_idx ON urls(zotero_processing_status);
CREATE INDEX idx_urls_citation_validation_status_idx ON urls(citation_validation_status);
CREATE UNIQUE INDEX urls_url_section_unique ON urls(url, section_id);

-- ============================================
-- STEP 5: Verification queries
-- ============================================

-- Check row count matches (should be same as before migration)
-- SELECT COUNT(*) FROM urls;

-- Check no data loss
-- SELECT 
--   COUNT(*) as total,
--   COUNT(DISTINCT id) as unique_ids,
--   COUNT(zotero_item_key) as with_zotero_keys
-- FROM urls;

COMMIT;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================

-- Next steps:
-- 1. Verify row counts
-- 2. Restart application
-- 3. Test basic functionality
-- 4. Review why rollback was necessary
-- 5. Fix issues before attempting migration again

