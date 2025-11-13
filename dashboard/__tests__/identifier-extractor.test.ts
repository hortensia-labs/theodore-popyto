/**
 * Tests for Identifier Extraction
 * 
 * NOTE: These are example test structures. 
 * Run with: pnpm test (after adding test framework)
 */

import { describe, it, expect } from '@jest/globals';
import {
  extractIdentifiersFromHtml,
  normalizeIdentifier,
  sortIdentifiersByPriority,
} from '../lib/extractors/html-identifier-extractor';

describe('HTML Identifier Extractor', () => {
  describe('Meta Tag Extraction', () => {
    it('should extract DOI from citation_doi meta tag', async () => {
      const html = '<meta name="citation_doi" content="10.1234/example.2024">';
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'DOI',
        value: '10.1234/example.2024',
        confidence: 'high',
      });
    });
    
    it('should extract PMID from citation_pmid meta tag', async () => {
      const html = '<meta name="citation_pmid" content="12345678">';
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'PMID',
        value: '12345678',
        confidence: 'high',
      });
    });
    
    it('should extract multiple identifiers from different meta tags', async () => {
      const html = `
        <meta name="citation_doi" content="10.1234/example">
        <meta name="citation_pmid" content="87654321">
      `;
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.type)).toContain('DOI');
      expect(result.map(r => r.type)).toContain('PMID');
    });
  });
  
  describe('JSON-LD Extraction', () => {
    it('should extract DOI from JSON-LD identifier field', async () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "ScholarlyArticle",
          "identifier": "10.1234/example"
        }
        </script>
      `;
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      expect(result.length).toBeGreaterThan(0);
      const doi = result.find(r => r.type === 'DOI');
      expect(doi).toBeDefined();
      expect(doi?.value).toBe('10.1234/example');
    });
    
    it('should extract ISBN from JSON-LD isbn field', async () => {
      const html = `
        <script type="application/ld+json">
        {
          "@type": "Book",
          "isbn": "978-0-123456-78-9"
        }
        </script>
      `;
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      const isbn = result.find(r => r.type === 'ISBN');
      expect(isbn).toBeDefined();
    });
  });
  
  describe('Normalization', () => {
    it('should normalize DOI by removing prefix', () => {
      expect(normalizeIdentifier('doi:10.1234/example', 'DOI')).toBe('10.1234/example');
      expect(normalizeIdentifier('DOI: 10.1234/example', 'DOI')).toBe('10.1234/example');
      expect(normalizeIdentifier('https://doi.org/10.1234/example', 'DOI')).toBe('10.1234/example');
    });
    
    it('should normalize PMID to digits only', () => {
      expect(normalizeIdentifier('PMID: 12345678', 'PMID')).toBe('12345678');
      expect(normalizeIdentifier('12345678', 'PMID')).toBe('12345678');
    });
    
    it('should normalize ArXiv ID', () => {
      expect(normalizeIdentifier('arXiv:2024.12345', 'ARXIV')).toBe('2024.12345');
      expect(normalizeIdentifier('2024.12345v2', 'ARXIV')).toBe('2024.12345v2');
    });
    
    it('should return null for invalid formats', () => {
      expect(normalizeIdentifier('invalid-doi', 'DOI')).toBeNull();
      expect(normalizeIdentifier('123', 'PMID')).toBeNull(); // Too short
      expect(normalizeIdentifier('invalid', 'ARXIV')).toBeNull();
    });
  });
  
  describe('Priority Sorting', () => {
    it('should sort DOI before other types', () => {
      const identifiers = [
        { type: 'ISBN' as const, value: '123', source: 'test', confidence: 'high' as const },
        { type: 'DOI' as const, value: '10.1234/test', source: 'test', confidence: 'high' as const },
        { type: 'PMID' as const, value: '12345678', source: 'test', confidence: 'high' as const },
      ];
      
      const sorted = sortIdentifiersByPriority(identifiers);
      
      expect(sorted[0].type).toBe('DOI');
      expect(sorted[1].type).toBe('PMID');
      expect(sorted[2].type).toBe('ISBN');
    });
    
    it('should sort by confidence when same type', () => {
      const identifiers = [
        { type: 'DOI' as const, value: '10.1/low', source: 'test', confidence: 'low' as const },
        { type: 'DOI' as const, value: '10.1/high', source: 'test', confidence: 'high' as const },
        { type: 'DOI' as const, value: '10.1/med', source: 'test', confidence: 'medium' as const },
      ];
      
      const sorted = sortIdentifiersByPriority(identifiers);
      
      expect(sorted[0].confidence).toBe('high');
      expect(sorted[1].confidence).toBe('medium');
      expect(sorted[2].confidence).toBe('low');
    });
  });
  
  describe('Deduplication', () => {
    it('should remove duplicate identifiers', async () => {
      const html = `
        <meta name="citation_doi" content="10.1234/example">
        <meta name="dc.identifier.doi" content="10.1234/example">
      `;
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      // Should only have one DOI
      const dois = result.filter(r => r.type === 'DOI');
      expect(dois).toHaveLength(1);
    });
    
    it('should keep higher confidence when duplicates exist', async () => {
      const html = `
        <meta name="citation_doi" content="10.1234/example">
        <div>DOI: 10.1234/example</div>
      `;
      const result = await extractIdentifiersFromHtml(html, 'http://example.com');
      
      const dois = result.filter(r => r.type === 'DOI');
      expect(dois).toHaveLength(1);
      expect(dois[0].confidence).toBe('high'); // From meta tag, not content
    });
  });
});

describe('Identifier Validation', () => {
  it('should validate DOI format', () => {
    expect(normalizeIdentifier('10.1234/example', 'DOI')).toBe('10.1234/example');
    expect(normalizeIdentifier('10.1234/example.2024.12345', 'DOI')).toBe('10.1234/example.2024.12345');
    expect(normalizeIdentifier('not-a-doi', 'DOI')).toBeNull();
  });
  
  it('should validate PMID length', () => {
    expect(normalizeIdentifier('1234567', 'PMID')).toBe('1234567'); // 7 digits OK
    expect(normalizeIdentifier('12345678', 'PMID')).toBe('12345678'); // 8 digits OK
    expect(normalizeIdentifier('123456', 'PMID')).toBeNull(); // Too short
    expect(normalizeIdentifier('123456789', 'PMID')).toBeNull(); // Too long
  });
  
  it('should validate ArXiv format', () => {
    expect(normalizeIdentifier('2024.12345', 'ARXIV')).toBe('2024.12345');
    expect(normalizeIdentifier('2024.12345v2', 'ARXIV')).toBe('2024.12345v2');
    expect(normalizeIdentifier('invalid', 'ARXIV')).toBeNull();
  });
});

