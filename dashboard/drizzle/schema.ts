/* eslint-disable @typescript-eslint/no-explicit-any */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Sections table - tracks thesis sections that have URL reports
 */
export const sections = sqliteTable('sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(), // e.g., "3-fundamentos-1"
  title: text('title'),
  path: text('path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * URLs table - stores base URL data imported from JSON reports
 */
export const urls = sqliteTable('urls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  
  // Core URL data
  url: text('url').notNull(),
  domain: text('domain'),
  
  // Technical metadata
  statusCode: integer('status_code'),
  contentType: text('content_type'),
  finalUrl: text('final_url'),
  redirectCount: integer('redirect_count'),
  isAccessible: integer('is_accessible', { mode: 'boolean' }).default(false),
  
  // Status tracking
  success: integer('success', { mode: 'boolean' }).notNull().default(true),
  hasErrors: integer('has_errors', { mode: 'boolean' }).notNull().default(false),
  
  // Zotero processing tracking
  zoteroItemKey: text('zotero_item_key'),
  zoteroProcessedAt: integer('zotero_processed_at', { mode: 'timestamp' }),
  zoteroProcessingStatus: text('zotero_processing_status'), // 'processing', 'stored', 'failed'
  zoteroProcessingError: text('zotero_processing_error'),
  zoteroProcessingMethod: text('zotero_processing_method'), // 'identifier', 'url', 'existing_item'
  
  // Citation validation tracking
  citationValidationStatus: text('citation_validation_status'), // 'valid', 'incomplete'
  citationValidatedAt: integer('citation_validated_at', { mode: 'timestamp' }),
  citationValidationDetails: text('citation_validation_details', { mode: 'json' }).$type<{ missingFields?: string[] }>(),
  
  // Workflow tracking
  processWorkflowVersion: text('process_workflow_version'), // Track which version processed this
  contentFetchAttempts: integer('content_fetch_attempts').default(0),
  lastFetchError: text('last_fetch_error'),
  identifierCount: integer('identifier_count').default(0), // Denormalized for quick filtering
  hasExtractedMetadata: integer('has_extracted_metadata', { mode: 'boolean' }).default(false),
  
  // Timestamps
  discoveredAt: integer('discovered_at', { mode: 'timestamp' }),
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  sectionIdIdx: index('urls_section_id_idx').on(table.sectionId),
  domainIdx: index('urls_domain_idx').on(table.domain),
  statusCodeIdx: index('urls_status_code_idx').on(table.statusCode),
  isAccessibleIdx: index('urls_is_accessible_idx').on(table.isAccessible),
  zoteroItemKeyIdx: index('urls_zotero_item_key_idx').on(table.zoteroItemKey),
  zoteroProcessingStatusIdx: index('urls_zotero_processing_status_idx').on(table.zoteroProcessingStatus),
  citationValidationStatusIdx: index('urls_citation_validation_status_idx').on(table.citationValidationStatus),
  urlSectionUnique: uniqueIndex('urls_url_section_unique').on(table.url, table.sectionId),
}));

/**
 * URL analysis data - stores fields that determine URL classification
 */
export const urlAnalysisData = sqliteTable('url_analysis_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }).unique(),
  
  // Fields that drive computed status
  validIdentifiers: text('valid_identifiers', { mode: 'json' }).$type<string[]>(), // JSON array
  webTranslators: text('web_translators', { mode: 'json' }).$type<string[]>(), // JSON array
  aiTranslation: integer('ai_translation', { mode: 'boolean' }).default(false),
  
  // Store entire raw metadata for flexibility
  rawMetadata: text('raw_metadata', { mode: 'json' }).$type<Record<string, any>>(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  urlIdIdx: index('url_analysis_data_url_id_idx').on(table.urlId),
}));

/**
 * URL enrichments - user-added data for URLs
 */
export const urlEnrichments = sqliteTable('url_enrichments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }).unique(),
  
  // User data
  notes: text('notes'),
  customIdentifiers: text('custom_identifiers', { mode: 'json' }).$type<string[]>().default([]), // JSON array
  
  // Tracking
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewedBy: text('reviewed_by'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  urlIdIdx: index('url_enrichments_url_id_idx').on(table.urlId),
}));

/**
 * URL metadata - flexible storage for varied report metadata
 */
export const urlMetadata = sqliteTable('url_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }),
  
  metadataType: text('metadata_type').notNull(), // 'headers', 'timing', 'content_analysis', 'other'
  data: text('data', { mode: 'json' }).$type<Record<string, any>>().notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  urlIdIdx: index('url_metadata_url_id_idx').on(table.urlId),
  metadataTypeIdx: index('url_metadata_type_idx').on(table.metadataType),
}));

/**
 * Import history - tracks when JSON reports were imported
 */
export const importHistory = sqliteTable('import_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sectionId: integer('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  
  filePath: text('file_path').notNull(),
  fileHash: text('file_hash').notNull(), // SHA256 hash
  
  urlsImported: integer('urls_imported').notNull().default(0),
  urlsUpdated: integer('urls_updated').notNull().default(0),
  urlsSkipped: integer('urls_skipped').notNull().default(0),
  
  errors: text('errors', { mode: 'json' }).$type<string[]>(),
  
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  sectionIdIdx: index('import_history_section_id_idx').on(table.sectionId),
  importedAtIdx: index('import_history_imported_at_idx').on(table.importedAt),
}));

// Type exports for use in application
export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export type Url = typeof urls.$inferSelect;
export type NewUrl = typeof urls.$inferInsert;

export type UrlAnalysisData = typeof urlAnalysisData.$inferSelect;
export type NewUrlAnalysisData = typeof urlAnalysisData.$inferInsert;

export type UrlEnrichment = typeof urlEnrichments.$inferSelect;
export type NewUrlEnrichment = typeof urlEnrichments.$inferInsert;

export type UrlMetadata = typeof urlMetadata.$inferSelect;
export type NewUrlMetadata = typeof urlMetadata.$inferInsert;

export type ImportHistory = typeof importHistory.$inferSelect;
export type NewImportHistory = typeof importHistory.$inferInsert;

/**
 * URL Content Cache - tracks cached content files and metadata
 */
export const urlContentCache = sqliteTable('url_content_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }).unique(),
  
  // Content metadata
  contentHash: text('content_hash').notNull(), // SHA-256 of content
  contentType: text('content_type').notNull(), // MIME type
  contentSize: integer('content_size').notNull(), // bytes
  contentLanguage: text('content_language'), // detected language
  
  // File paths
  rawContentPath: text('raw_content_path').notNull(), // path to cached file
  processedContentPath: text('processed_content_path'), // path to processed/cleaned version
  
  // HTTP metadata
  statusCode: integer('status_code').notNull(),
  redirectChain: text('redirect_chain', { mode: 'json' }).$type<string[]>(),
  responseHeaders: text('response_headers', { mode: 'json' }).$type<Record<string, string>>(),
  
  // Timestamps
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull(),
  lastAccessedAt: integer('last_accessed_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }), // cache expiry
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  contentHashIdx: index('url_content_cache_hash_idx').on(table.contentHash),
  fetchedAtIdx: index('url_content_cache_fetched_at_idx').on(table.fetchedAt),
  urlIdIdx: index('url_content_cache_url_id_idx').on(table.urlId),
}));

/**
 * URL Identifiers - stores all identifiers found for each URL
 */
export const urlIdentifiers = sqliteTable('url_identifiers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }),
  
  // Identifier data
  identifierType: text('identifier_type').notNull(), // 'DOI', 'PMID', 'ARXIV', 'ISBN'
  identifierValue: text('identifier_value').notNull(),
  
  // Extraction metadata
  extractionMethod: text('extraction_method').notNull(), // 'pdf_metadata', 'html_meta_tag', 'regex_content', 'zotero_pdf'
  extractionSource: text('extraction_source'), // 'page_1', 'meta[name="citation_doi"]', etc.
  confidence: text('confidence').notNull(), // 'high', 'medium', 'low'
  
  // Preview data (cached from Zotero)
  previewFetched: integer('preview_fetched', { mode: 'boolean' }).default(false),
  previewData: text('preview_data', { mode: 'json' }).$type<any>(),
  previewQualityScore: integer('preview_quality_score'), // 0-100
  previewError: text('preview_error'),
  previewFetchedAt: integer('preview_fetched_at', { mode: 'timestamp' }),
  
  // Selection tracking
  userSelected: integer('user_selected', { mode: 'boolean' }).default(false),
  selectedAt: integer('selected_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  urlIdIdx: index('url_identifiers_url_id_idx').on(table.urlId),
  typeValueIdx: uniqueIndex('url_identifiers_type_value_idx').on(table.identifierType, table.identifierValue, table.urlId),
  previewFetchedIdx: index('url_identifiers_preview_fetched_idx').on(table.previewFetched),
  identifierTypeIdx: index('url_identifiers_type_idx').on(table.identifierType),
}));

/**
 * URL Extracted Metadata - stores metadata extracted from content (for Path 2)
 */
export const urlExtractedMetadata = sqliteTable('url_extracted_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlId: integer('url_id').notNull().references(() => urls.id, { onDelete: 'cascade' }).unique(),
  
  // Core bibliographic fields
  title: text('title'),
  creators: text('creators', { mode: 'json' }).$type<Array<{
    creatorType: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  }>>(),
  date: text('date'),
  itemType: text('item_type'), // 'journalArticle', 'blogPost', 'webpage', etc.
  
  // Additional fields
  abstractNote: text('abstract_note'),
  publicationTitle: text('publication_title'),
  url: text('url'),
  accessDate: text('access_date'),
  language: text('language'),
  
  // Extraction metadata
  extractionMethod: text('extraction_method').notNull(), // 'html_meta_tags', 'pdf_metadata', 'opengraph', 'json_ld'
  extractionSources: text('extraction_sources', { mode: 'json' }).$type<Record<string, string>>(), // field -> source mapping
  qualityScore: integer('quality_score'), // 0-100
  
  // Validation
  validationStatus: text('validation_status'), // 'valid', 'incomplete', 'invalid'
  validationErrors: text('validation_errors', { mode: 'json' }).$type<string[]>(),
  missingFields: text('missing_fields', { mode: 'json' }).$type<string[]>(),
  
  // User review
  userReviewed: integer('user_reviewed', { mode: 'boolean' }).default(false),
  userApproved: integer('user_approved', { mode: 'boolean' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  urlIdIdx: index('url_extracted_metadata_url_id_idx').on(table.urlId),
  validationStatusIdx: index('url_extracted_metadata_validation_status_idx').on(table.validationStatus),
}));

// Type exports for new tables
export type UrlContentCache = typeof urlContentCache.$inferSelect;
export type NewUrlContentCache = typeof urlContentCache.$inferInsert;

export type UrlIdentifier = typeof urlIdentifiers.$inferSelect;
export type NewUrlIdentifier = typeof urlIdentifiers.$inferInsert;

export type UrlExtractedMetadata = typeof urlExtractedMetadata.$inferSelect;
export type NewUrlExtractedMetadata = typeof urlExtractedMetadata.$inferInsert;

