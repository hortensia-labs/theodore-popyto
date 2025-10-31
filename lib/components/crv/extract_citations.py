#!/usr/bin/env python3
"""
Citation Extraction Script
Extracts APA 7 style citations from markdown thesis files
"""

import re
import json
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib
import unicodedata

# Config import - now in same directory
from citation_patterns import CITATION_PATTERNS

@dataclass
class Citation:
    """Represents a single citation found in the text"""
    id: str
    raw_text: str
    normalized: Dict[str, Any]
    location: Dict[str, Any]
    type: str
    confidence: float

    def to_dict(self) -> Dict:
        return asdict(self)

class CitationExtractor:
    """Extracts and normalizes APA citations from markdown files"""

    def __init__(self):
        self.patterns = CITATION_PATTERNS
        self.citations = []
        self.stats = {
            'files_processed': 0,
            'citations_found': 0,
            'citations_by_type': {}
        }

        # Setup logging
        log_dir = Path("generated/reports/crv/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Loaded {len(self.patterns)} pattern categories")

    def _generate_citation_id(self, text: str, location: str) -> str:
        """Generate unique ID for citation"""
        content = f"{text}_{location}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _normalize_text(self, text: str) -> str:
        """Normalize unicode characters and spacing"""
        # Normalize unicode
        text = unicodedata.normalize('NFKC', text)
        # Fix spacing
        text = re.sub(r'\s+', ' ', text)
        # Fix dashes
        text = re.sub(r'[–—−]', '-', text)
        return text.strip()

    def _extract_authors(self, author_text: str) -> List[str]:
        """Extract individual authors from citation text"""
        authors = []

        # Clean the text
        author_text = self._normalize_text(author_text)

        # Handle "et al."
        if 'et al.' in author_text:
            # Extract first author
            first_author = re.split(r'\s+et\s+al\.', author_text)[0].strip()
            authors.append(first_author)
            authors.append('et al.')
            return authors

        # Split by common separators
        # Handle both "&" and "and" in English and "y" in Spanish
        separators = [r'\s*[&]\s*', r'\s+and\s+', r'\s+y\s+', r'\s*[,;]\s*']

        current_text = author_text
        for sep in separators:
            if re.search(sep, current_text):
                parts = re.split(sep, current_text)
                for part in parts:
                    part = part.strip()
                    if part and not part in ['', ' ']:
                        authors.append(part)
                return authors

        # Single author
        if author_text.strip():
            authors.append(author_text.strip())

        return authors

    def _extract_year(self, year_text: str) -> str:
        """Extract and normalize year from citation"""
        year_text = year_text.strip()

        # Handle "in press" or "en prensa"
        if re.search(r'(in\s+press|en\s+prensa)', year_text, re.IGNORECASE):
            return "in press"

        # Extract 4-digit year with optional letter
        match = re.search(r'(\d{4}[a-z]?)', year_text)
        if match:
            return match.group(1)

        return year_text

    def _extract_pages(self, page_text: str) -> Optional[str]:
        """Extract page numbers from citation"""
        if not page_text:
            return None

        page_text = self._normalize_text(page_text)

        # Look for page patterns
        match = re.search(r'(\d+(?:-\d+)?)', page_text)
        if match:
            return match.group(1)

        return page_text

    def _parse_citation(self, raw_text: str, pattern_info: Dict, match_groups: Tuple) -> Citation:
        """Parse matched citation into structured format"""
        normalized = {}
        citation_type = pattern_info['type']

        # Handle different citation types
        if citation_type in ['parenthetical', 'narrative']:
            if 'et_al' in pattern_info['name']:
                # Et al. citation
                normalized['authors'] = self._extract_authors(match_groups[0])
                normalized['year'] = self._extract_year(match_groups[1])
            elif 'two' in pattern_info['name'] or '&' in raw_text or ' y ' in raw_text:
                # Two authors
                if citation_type == 'narrative' and len(match_groups) >= 3:
                    normalized['authors'] = [match_groups[0], match_groups[1]]
                    normalized['year'] = self._extract_year(match_groups[2])
                else:
                    normalized['authors'] = self._extract_authors(match_groups[0])
                    normalized['year'] = self._extract_year(match_groups[1] if len(match_groups) > 1 else "")
            else:
                # Single author
                normalized['authors'] = self._extract_authors(match_groups[0])
                normalized['year'] = self._extract_year(match_groups[1] if len(match_groups) > 1 else "")

        elif citation_type == 'with_pages':
            normalized['authors'] = self._extract_authors(match_groups[0])
            normalized['year'] = self._extract_year(match_groups[1] if len(match_groups) > 1 else "")
            normalized['pages'] = self._extract_pages(match_groups[2] if len(match_groups) > 2 else "")

        elif citation_type == 'multiple_citations':
            # Split and process each citation
            citations = re.split(r';\s*', match_groups[0])
            normalized['multiple'] = []
            for cit in citations:
                parts = re.match(r'([^,]+),\s*(\d{4}[a-z]?)', cit.strip())
                if parts:
                    normalized['multiple'].append({
                        'authors': self._extract_authors(parts.group(1)),
                        'year': self._extract_year(parts.group(2))
                    })

        elif citation_type == 'secondary':
            normalized['original_author'] = match_groups[0]
            normalized['original_year'] = self._extract_year(match_groups[1])
            normalized['cited_in_author'] = match_groups[2]
            normalized['cited_in_year'] = self._extract_year(match_groups[3])

        else:
            # Generic handling for other types
            if len(match_groups) > 0:
                normalized['authors'] = self._extract_authors(match_groups[0])
            if len(match_groups) > 1:
                normalized['year'] = self._extract_year(match_groups[1])
            if len(match_groups) > 2:
                normalized['additional'] = list(match_groups[2:])

        # Calculate confidence based on completeness
        confidence = 1.0
        if not normalized.get('year'):
            confidence -= 0.3
        if not normalized.get('authors') and not normalized.get('multiple'):
            confidence -= 0.3

        return Citation(
            id="",  # Will be set later
            raw_text=raw_text,
            normalized=normalized,
            location={},  # Will be set by caller
            type=citation_type,
            confidence=max(0.1, confidence)
        )

    def extract_from_file(self, filepath: Path) -> List[Citation]:
        """Extract all citations from a single markdown file"""
        if not filepath.exists():
            self.logger.warning(f"File not found: {filepath}")
            return []

        self.logger.info(f"Processing file: {filepath}")

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.logger.error(f"Error reading file {filepath}: {e}")
            return []

        file_citations = []
        lines = content.split('\n')

        # Process each pattern category
        for category_name, patterns in self.patterns.items():
            if not isinstance(patterns, list):
                continue

            for pattern_info in patterns:
                pattern = pattern_info['pattern']

                try:
                    regex = re.compile(pattern, re.UNICODE)
                except re.error as e:
                    self.logger.error(f"Invalid regex pattern '{pattern}': {e}")
                    continue

                # Find all matches in the content
                for line_num, line in enumerate(lines, 1):
                    for match in regex.finditer(line):
                        raw_text = match.group(0)

                        # Get context (50 chars before and after)
                        start = max(0, match.start() - 50)
                        end = min(len(line), match.end() + 50)
                        context = line[start:end]

                        # Parse the citation
                        citation = self._parse_citation(
                            raw_text=raw_text,
                            pattern_info=pattern_info,
                            match_groups=match.groups()
                        )

                        # Set location
                        citation.location = {
                            'file': str(filepath),
                            'line': line_num,
                            'column': match.start() + 1,
                            'context': context
                        }

                        # Generate ID
                        citation.id = self._generate_citation_id(
                            raw_text,
                            f"{filepath}:{line_num}:{match.start()}"
                        )

                        # Check if we already found this exact citation
                        duplicate = False
                        for existing in file_citations:
                            if (existing.raw_text == citation.raw_text and
                                existing.location['line'] == citation.location['line'] and
                                existing.location['column'] == citation.location['column']):
                                duplicate = True
                                break

                        if not duplicate:
                            file_citations.append(citation)

                            # Update stats
                            self.stats['citations_by_type'][citation.type] = \
                                self.stats['citations_by_type'].get(citation.type, 0) + 1

        self.logger.info(f"Found {len(file_citations)} citations in {filepath.name}")
        self.stats['files_processed'] += 1
        self.stats['citations_found'] += len(file_citations)

        return file_citations

    def process_all_sections(self) -> List[Citation]:
        """Process all markdown files in thesis sections"""
        sections_dir = Path("sections")

        if not sections_dir.exists():
            raise FileNotFoundError(f"Sections directory not found: {sections_dir}")

        all_citations = []

        # Find all content markdown files
        content_files = list(sections_dir.glob("*/content/*.md"))

        self.logger.info(f"Found {len(content_files)} content files to process")

        for filepath in sorted(content_files):
            citations = self.extract_from_file(filepath)
            all_citations.extend(citations)

        self.citations = all_citations
        return all_citations

    def save_results(self, output_dir: str = "generated/reports/crv/data/raw"):
        """Save extracted citations to JSON and markdown formats"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save as JSON
        json_path = output_path / "citations.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                'metadata': {
                    'extraction_date': datetime.now().isoformat(),
                    'total_citations': len(self.citations),
                    'stats': self.stats
                },
                'citations': [c.to_dict() for c in self.citations]
            }, f, indent=2, ensure_ascii=False)

        self.logger.info(f"Saved {len(self.citations)} citations to {json_path}")

        # Save as markdown for human review
        md_path = Path("generated/reports/crv") / "inline-citations.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("# Extracted Inline Citations\n\n")
            f.write(f"**Extraction Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Total Citations Found:** {len(self.citations)}\n\n")

            # Group by file
            citations_by_file = {}
            for citation in self.citations:
                file_path = citation.location['file']
                if file_path not in citations_by_file:
                    citations_by_file[file_path] = []
                citations_by_file[file_path].append(citation)

            # Write citations grouped by file
            for file_path in sorted(citations_by_file.keys()):
                f.write(f"\n## {file_path}\n\n")

                for citation in citations_by_file[file_path]:
                    f.write(f"- **Line {citation.location['line']}:** `{citation.raw_text}`\n")
                    f.write(f"  - Type: {citation.type}\n")
                    f.write(f"  - Normalized: {citation.normalized}\n")
                    f.write(f"  - Confidence: {citation.confidence:.2f}\n")
                    if citation.confidence < 0.8:
                        f.write(f"  - ⚠️ Low confidence - manual review recommended\n")
                    f.write("\n")

        self.logger.info(f"Saved human-readable report to {md_path}")

        # Print summary
        print("\n" + "="*50)
        print("EXTRACTION SUMMARY")
        print("="*50)
        print(f"Files processed: {self.stats['files_processed']}")
        print(f"Total citations found: {self.stats['citations_found']}")
        print("\nCitations by type:")
        for ctype, count in sorted(self.stats['citations_by_type'].items()):
            print(f"  {ctype}: {count}")
        print("="*50)

def main():
    """Main execution function"""
    extractor = CitationExtractor()

    try:
        # Extract citations from all sections
        citations = extractor.process_all_sections()

        # Save results
        extractor.save_results()

        print(f"\n✅ Successfully extracted {len(citations)} citations")
        print(f"Results saved to: generated/reports/crv/data/raw/citations.json")
        print(f"Human-readable report: generated/reports/crv/inline-citations.md")

    except Exception as e:
        logging.error(f"Extraction failed: {e}")
        raise

if __name__ == "__main__":
    main()