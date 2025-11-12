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

