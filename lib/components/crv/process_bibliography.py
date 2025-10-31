#!/usr/bin/env python3
"""
Bibliography Processing Script
Parses and structures APA 7 style bibliography entries
"""

import re
import json
import logging
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib
import unicodedata

# Config import - now in same directory
from citation_patterns import BIBLIOGRAPHY_PATTERNS, VALIDATION_RULES

@dataclass
class BibliographyEntry:
    """Represents a single bibliography entry"""
    id: str
    raw_text: str
    line_number: int
    parsed: Dict[str, Any]
    type: str
    validation_status: str
    errors: List[str]

    def to_dict(self) -> Dict:
        return asdict(self)

class BibliographyProcessor:
    """Processes and parses APA bibliography entries"""

    def __init__(self, bibliography_path: Optional[str] = None):
        # Get bibliography path from environment or use default
        if bibliography_path:
            self.bibliography_path = Path(bibliography_path)
        else:
            env_section = os.getenv('BIBLIOGRAPHY_SECTION', '7-bibliografia')
            self.bibliography_path = Path(f"sections/{env_section}/content")

        self.config = {
            'bibliography_patterns': BIBLIOGRAPHY_PATTERNS,
            'validation_rules': VALIDATION_RULES
        }
        self.entries = []
        self.index = {}
        self.stats = {
            'total_entries': 0,
            'valid_entries': 0,
            'invalid_entries': 0,
            'entries_by_type': {}
        }

        # Setup logging
        log_dir = Path("generated/reports/crv/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"bibliography_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def _normalize_text(self, text: str) -> str:
        """Normalize unicode characters and spacing"""
        # Normalize unicode
        text = unicodedata.normalize('NFKC', text)
        # Fix spacing
        text = re.sub(r'\s+', ' ', text)
        # Fix dashes
        text = re.sub(r'[–—−]', '-', text)
        # Remove markdown formatting
        text = re.sub(r'[_*]', '', text)
        return text.strip()

    def _generate_entry_id(self, text: str, line_num: int) -> str:
        """Generate unique ID for bibliography entry"""
        content = f"{text}_{line_num}"
        return hashlib.md5(content.encode()).hexdigest()[:12]

    def _extract_authors(self, author_text: str) -> List[Dict[str, str]]:
        """Extract and parse authors from bibliography entry"""
        authors = []
        author_text = self._normalize_text(author_text)

        # Split by ", &" or ", y" for last author
        author_text = re.sub(r',\s*(&|y)\s*', ' & ', author_text)

        # Split by commas but preserve initials
        # Pattern to match individual authors
        author_pattern = r'([A-ZÁÉÍÓÚÑa-záéíóúñ\-\']+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ\-\']+)*),\s*([A-Z](?:\.\s*[A-Z]\.?)*)'

        # First try to extract structured authors
        matches = re.findall(author_pattern, author_text)

        if matches:
            for match in matches:
                authors.append({
                    'last_name': match[0],
                    'initials': match[1],
                    'full': f"{match[0]}, {match[1]}"
                })
        else:
            # Try splitting by " & " for multiple authors
            parts = re.split(r'\s*&\s*', author_text)
            for part in parts:
                part = part.strip()
                if ', ' in part:
                    last_name, initials = part.split(', ', 1)
                    authors.append({
                        'last_name': last_name,
                        'initials': initials,
                        'full': part
                    })
                elif part:
                    # Single name without clear structure
                    authors.append({
                        'last_name': part,
                        'initials': '',
                        'full': part
                    })

        return authors

    def _extract_year(self, entry_text: str) -> Optional[str]:
        """Extract publication year from entry"""
        # Look for year in parentheses
        match = re.search(r'\((\d{4}[a-z]?)\)', entry_text)
        if match:
            return match.group(1)

        # Look for year after comma
        match = re.search(r',\s*(\d{4}[a-z]?)[,\.]', entry_text)
        if match:
            return match.group(1)

        return None

    def _extract_title(self, entry_text: str) -> Optional[str]:
        """Extract title from bibliography entry"""
        # Remove authors and year first
        text_after_year = re.split(r'\(\d{4}[a-z]?\)\.?\s*', entry_text)
        if len(text_after_year) > 1:
            remaining = text_after_year[1]

            # Title usually ends at the next period followed by uppercase or italics
            match = re.match(r'^([^.]+?)\.(?:\s+[A-Z_]|\s*$)', remaining)
            if match:
                return self._normalize_text(match.group(1))

            # For book titles in italics
            match = re.match(r'^_([^_]+)_', remaining)
            if match:
                return self._normalize_text(match.group(1))

            # Fallback: take everything up to the first period
            parts = remaining.split('.', 1)
            if parts:
                return self._normalize_text(parts[0])

        return None

    def _detect_entry_type(self, entry_text: str) -> str:
        """Detect the type of bibliography entry"""
        entry_lower = entry_text.lower()

        # Check for specific patterns - order matters!
        if '[doctoral dissertation]' in entry_lower or '[tesis doctoral]' in entry_lower:
            return 'dissertation'
        elif '[master' in entry_lower or '[tesis de' in entry_lower:
            return 'thesis'
        elif re.search(r'\(\d+\),\s*\d+-\d+', entry_text):  # Volume(Issue), pages - journal pattern
            return 'journal_article'
        elif re.search(r',\s*\d+\(\d+\)', entry_text):  # Alternative journal pattern: , 15(3)
            return 'journal_article'
        elif ' In ' in entry_text or ' En ' in entry_text:
            return 'book_chapter'
        elif 'retrieved from' in entry_lower or 'recuperado de' in entry_lower:
            return 'web_resource'
        elif re.search(r'_[^_]+_', entry_text) and not re.search(r'\(\d+\)', entry_text):  # Italicized title without issue number
            return 'book'
        else:
            return 'unknown'

    def _parse_journal_article(self, entry_text: str) -> Dict[str, Any]:
        """Parse journal article entry"""
        parsed = {}

        # Extract authors
        author_match = re.match(r'^([^(]+)\s*\(', entry_text)
        if author_match:
            parsed['authors'] = self._extract_authors(author_match.group(1))

        # Extract year
        parsed['year'] = self._extract_year(entry_text)

        # Extract title
        parsed['title'] = self._extract_title(entry_text)

        # Extract journal, volume, issue, pages
        # Pattern: Journal Name, Volume(Issue), pages
        journal_pattern = r'\.([^,]+),\s*(\d+)(?:\((\d+)\))?,\s*(\d+[-–]\d+)'
        match = re.search(journal_pattern, entry_text)
        if match:
            parsed['journal'] = self._normalize_text(match.group(1))
            parsed['volume'] = match.group(2)
            parsed['issue'] = match.group(3) if match.group(3) else ''
            parsed['pages'] = match.group(4).replace('–', '-')

        # Extract DOI if present
        doi_match = re.search(r'(?:doi:|https://doi.org/)([^\s]+)', entry_text, re.IGNORECASE)
        if doi_match:
            parsed['doi'] = doi_match.group(1).rstrip('.')

        return parsed

    def _parse_book(self, entry_text: str) -> Dict[str, Any]:
        """Parse book entry"""
        parsed = {}

        # Extract authors
        author_match = re.match(r'^([^(]+)\s*\(', entry_text)
        if author_match:
            parsed['authors'] = self._extract_authors(author_match.group(1))

        # Extract year
        parsed['year'] = self._extract_year(entry_text)

        # Extract title (usually in italics)
        title_match = re.search(r'\(\d{4}[a-z]?\)\.?\s*_([^_]+)_', entry_text)
        if title_match:
            parsed['title'] = self._normalize_text(title_match.group(1))
        else:
            parsed['title'] = self._extract_title(entry_text)

        # Extract publisher (usually after the title)
        if parsed.get('title'):
            after_title = entry_text.split(parsed['title'])[-1]
            # Remove italics markers and period
            after_title = re.sub(r'[_\.]', '', after_title).strip()
            if after_title:
                parsed['publisher'] = self._normalize_text(after_title.split('.')[0])

        return parsed

    def _parse_web_resource(self, entry_text: str) -> Dict[str, Any]:
        """Parse web resource entry"""
        parsed = {}

        # Extract authors/organization
        author_match = re.match(r'^([^(]+)\s*\(', entry_text)
        if author_match:
            parsed['authors'] = self._extract_authors(author_match.group(1))

        # Extract date (might include month and day)
        date_match = re.search(r'\(([^)]+)\)', entry_text)
        if date_match:
            parsed['date'] = date_match.group(1)
            # Try to extract just the year
            year_match = re.search(r'\d{4}', parsed['date'])
            if year_match:
                parsed['year'] = year_match.group()

        # Extract title
        parsed['title'] = self._extract_title(entry_text)

        # Extract URL
        url_match = re.search(r'(?:Retrieved from|Recuperado de)\s+(.+)$', entry_text, re.IGNORECASE)
        if url_match:
            parsed['url'] = url_match.group(1).strip()
        else:
            # Look for any URL pattern
            url_match = re.search(r'https?://[^\s]+', entry_text)
            if url_match:
                parsed['url'] = url_match.group().rstrip('.')

        return parsed

    def _parse_entry(self, entry_text: str, line_number: int) -> BibliographyEntry:
        """Parse a bibliography entry into structured format"""
        entry_text = entry_text.strip()

        if not entry_text:
            return None

        # Detect entry type
        entry_type = self._detect_entry_type(entry_text)

        # Parse based on type
        parsed = {}
        errors = []

        try:
            if entry_type == 'journal_article':
                parsed = self._parse_journal_article(entry_text)
            elif entry_type == 'book':
                parsed = self._parse_book(entry_text)
            elif entry_type == 'web_resource':
                parsed = self._parse_web_resource(entry_text)
            else:
                # Generic parsing
                parsed['authors'] = self._extract_authors(entry_text.split('(')[0]) if '(' in entry_text else []
                parsed['year'] = self._extract_year(entry_text)
                parsed['title'] = self._extract_title(entry_text)
        except Exception as e:
            self.logger.warning(f"Error parsing entry at line {line_number}: {e}")
            errors.append(f"Parsing error: {str(e)}")

        # Validate the parsed entry
        validation_status = 'valid'

        # Check required fields
        if not parsed.get('authors'):
            errors.append("Missing authors")
            validation_status = 'invalid'

        if not parsed.get('year'):
            errors.append("Missing publication year")
            validation_status = 'invalid'

        if not parsed.get('title'):
            errors.append("Missing title")
            validation_status = 'invalid'

        # Check formatting
        if not entry_text.endswith('.'):
            errors.append("Entry should end with a period")
            if validation_status == 'valid':
                validation_status = 'warning'

        return BibliographyEntry(
            id=self._generate_entry_id(entry_text, line_number),
            raw_text=entry_text,
            line_number=line_number,
            parsed=parsed,
            type=entry_type,
            validation_status=validation_status,
            errors=errors
        )

    def load_and_parse(self) -> List[BibliographyEntry]:
        """Load and parse all bibliography entries"""
        bibliography_files = list(self.bibliography_path.glob("*.md"))

        if not bibliography_files:
            raise FileNotFoundError(f"No bibliography files found in {self.bibliography_path}")

        all_entries = []

        for file_path in bibliography_files:
            self.logger.info(f"Processing bibliography file: {file_path}")

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
            except Exception as e:
                self.logger.error(f"Error reading file {file_path}: {e}")
                continue

            # Process each line as a potential bibliography entry
            for line_num, line in enumerate(lines, 1):
                line = line.strip()

                # Skip empty lines and headers
                if not line or line.startswith('#'):
                    continue

                # Parse the entry
                entry = self._parse_entry(line, line_num)

                if entry:
                    all_entries.append(entry)

                    # Update stats
                    self.stats['total_entries'] += 1
                    if entry.validation_status == 'valid':
                        self.stats['valid_entries'] += 1
                    else:
                        self.stats['invalid_entries'] += 1

                    self.stats['entries_by_type'][entry.type] = \
                        self.stats['entries_by_type'].get(entry.type, 0) + 1

        self.entries = all_entries
        self.logger.info(f"Parsed {len(all_entries)} bibliography entries")

        # Build index for quick lookup
        self._build_index()

        return all_entries

    def _build_index(self):
        """Build lookup indices for bibliography entries"""
        self.index = {
            'by_year': {},
            'by_author': {},
            'by_author_year': {}
        }

        for entry in self.entries:
            # Index by year
            year = entry.parsed.get('year')
            if year:
                if year not in self.index['by_year']:
                    self.index['by_year'][year] = []
                self.index['by_year'][year].append(entry)

            # Index by author
            authors = entry.parsed.get('authors', [])
            for author in authors:
                if isinstance(author, dict):
                    last_name = author.get('last_name', '')
                else:
                    last_name = str(author)

                if last_name:
                    if last_name not in self.index['by_author']:
                        self.index['by_author'][last_name] = []
                    self.index['by_author'][last_name].append(entry)

                    # Index by author-year combination
                    if year:
                        key = f"{last_name}_{year}"
                        if key not in self.index['by_author_year']:
                            self.index['by_author_year'][key] = []
                        self.index['by_author_year'][key].append(entry)

        self.logger.info(f"Built index with {len(self.index['by_author'])} unique authors")

    def save_results(self, output_dir: str = "generated/reports/crv/data/raw"):
        """Save processed bibliography to JSON and markdown formats"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save as JSON
        json_path = output_path / "bibliography.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                'metadata': {
                    'processing_date': datetime.now().isoformat(),
                    'total_entries': len(self.entries),
                    'stats': self.stats
                },
                'entries': [e.to_dict() for e in self.entries],
                'index': {
                    'by_year': {year: [e.id for e in entries]
                               for year, entries in self.index['by_year'].items()},
                    'by_author': {author: [e.id for e in entries]
                                  for author, entries in self.index['by_author'].items()}
                }
            }, f, indent=2, ensure_ascii=False)

        self.logger.info(f"Saved {len(self.entries)} entries to {json_path}")

        # Save processed bibliography as markdown
        md_path = Path("generated/reports/crv/data/processed") / "bibliography-processed.md"
        md_path.parent.mkdir(parents=True, exist_ok=True)

        with open(md_path, 'w', encoding='utf-8') as f:
            f.write("# Processed Bibliography\n\n")
            f.write(f"**Processing Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Total Entries:** {len(self.entries)}\n")
            f.write(f"**Valid Entries:** {self.stats['valid_entries']}\n")
            f.write(f"**Invalid Entries:** {self.stats['invalid_entries']}\n\n")

            # Group by validation status
            f.write("## Valid Entries\n\n")
            for entry in self.entries:
                if entry.validation_status == 'valid':
                    f.write(f"### Entry {entry.id}\n")
                    f.write(f"**Line {entry.line_number}:** {entry.raw_text}\n\n")
                    f.write(f"**Type:** {entry.type}\n\n")
                    f.write(f"**Parsed Data:**\n")
                    for key, value in entry.parsed.items():
                        f.write(f"- {key}: {value}\n")
                    f.write("\n---\n\n")

            if self.stats['invalid_entries'] > 0:
                f.write("## Invalid Entries\n\n")
                for entry in self.entries:
                    if entry.validation_status != 'valid':
                        f.write(f"### Entry {entry.id}\n")
                        f.write(f"**Line {entry.line_number}:** {entry.raw_text}\n\n")
                        f.write(f"**Type:** {entry.type}\n\n")
                        f.write(f"**Errors:**\n")
                        for error in entry.errors:
                            f.write(f"- ⚠️ {error}\n")
                        f.write(f"\n**Parsed Data:**\n")
                        for key, value in entry.parsed.items():
                            f.write(f"- {key}: {value}\n")
                        f.write("\n---\n\n")

        self.logger.info(f"Saved processed bibliography to {md_path}")

        # Print summary
        print("\n" + "="*50)
        print("BIBLIOGRAPHY PROCESSING SUMMARY")
        print("="*50)
        print(f"Total entries: {self.stats['total_entries']}")
        print(f"Valid entries: {self.stats['valid_entries']}")
        print(f"Invalid entries: {self.stats['invalid_entries']}")
        print("\nEntries by type:")
        for etype, count in sorted(self.stats['entries_by_type'].items()):
            print(f"  {etype}: {count}")
        print("="*50)

    def find_entry(self, authors: List[str], year: str) -> Optional[BibliographyEntry]:
        """Find bibliography entry by authors and year"""
        # Try exact match first
        for author in authors:
            if 'et al.' in author:
                continue

            # Clean author name
            author_clean = re.sub(r'[^\w\s]', '', author).strip()

            key = f"{author_clean}_{year}"
            if key in self.index['by_author_year']:
                return self.index['by_author_year'][key][0]

            # Try just last name
            if author_clean in self.index['by_author']:
                for entry in self.index['by_author'][author_clean]:
                    if entry.parsed.get('year') == year:
                        return entry

        return None

def main():
    """Main execution function"""
    processor = BibliographyProcessor()

    try:
        # Load and parse bibliography
        entries = processor.load_and_parse()

        # Save results
        processor.save_results()

        print(f"\n✅ Successfully processed {len(entries)} bibliography entries")
        print(f"Results saved to: generated/reports/crv/data/raw/bibliography.json")
        print(f"Processed report: generated/reports/crv/data/processed/bibliography-processed.md")

    except Exception as e:
        logging.error(f"Bibliography processing failed: {e}")
        raise

if __name__ == "__main__":
    main()