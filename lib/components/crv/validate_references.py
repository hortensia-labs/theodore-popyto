#!/usr/bin/env python3
"""
Reference Validation Engine
Cross-references citations with bibliography and validates APA formatting
"""

import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from difflib import SequenceMatcher
import unicodedata

@dataclass
class ValidationResult:
    """Represents validation result for a citation"""
    citation_id: str
    status: str  # 'valid', 'invalid', 'warning'
    issues: List[Dict[str, Any]]
    suggestions: List[str]
    matched_bibliography: Optional[str]
    confidence: float

    def to_dict(self) -> Dict:
        return asdict(self)

@dataclass
class ValidationReport:
    """Overall validation report"""
    total_citations: int
    valid_citations: int
    invalid_citations: int
    warnings: int
    missing_bibliography: List[Dict]
    format_violations: List[Dict]
    duplicate_citations: List[Dict]
    statistics: Dict[str, Any]

    def to_dict(self) -> Dict:
        return asdict(self)

class ReferenceValidator:
    """Validates citations against bibliography and APA rules"""

    def __init__(self):
        self.citations = []
        self.bibliography = []
        self.bibliography_index = {}
        self.validation_results = []

        # Setup logging
        log_dir = Path("generated/reports/crv/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

        # APA validation rules
        self.apa_rules = {
            'citation': {
                'parentheses': r'^\([^)]+\)$',
                'year_format': r'\d{4}[a-z]?',
                'et_al_format': r'et al\.',
                'ampersand_usage': r'[&]',  # Should use & in parenthetical
                'and_usage': r'\band\b',  # Should use 'and' in narrative
                'page_format': r'pp?\.\s*\d+',
                'comma_before_year': r',\s*\d{4}',
            },
            'bibliography': {
                'ending_period': r'\.$',
                'year_parentheses': r'\(\d{4}[a-z]?\)',
                'author_format': r'^[A-Z][a-z]+,\s*[A-Z]\.',
                'title_case': r'^[A-Z][a-z]+',
            }
        }

    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison"""
        text = unicodedata.normalize('NFKC', text)
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[–—−]', '-', text)
        return text.strip().lower()

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two strings"""
        text1_norm = self._normalize_text(text1)
        text2_norm = self._normalize_text(text2)
        return SequenceMatcher(None, text1_norm, text2_norm).ratio()

    def _fuzzy_match_authors(self, citation_authors: List[str], bib_authors: List[Dict]) -> float:
        """Fuzzy match authors between citation and bibliography"""
        if not citation_authors or not bib_authors:
            return 0.0

        # Normalize citation authors
        cit_authors_norm = []
        for author in citation_authors:
            if isinstance(author, str):
                if author == 'et al.':
                    continue
                cit_authors_norm.append(self._normalize_text(author))

        # Normalize bibliography authors
        bib_authors_norm = []
        for author in bib_authors:
            if isinstance(author, dict):
                last_name = author.get('last_name', '')
                bib_authors_norm.append(self._normalize_text(last_name))
            else:
                bib_authors_norm.append(self._normalize_text(str(author)))

        if not cit_authors_norm or not bib_authors_norm:
            return 0.0

        # Check if citation has "et al." - only need to match first author
        has_et_al = any('et al' in str(a).lower() for a in citation_authors)

        if has_et_al:
            # Only match first author for "et al." citations
            if cit_authors_norm and bib_authors_norm:
                return self._calculate_similarity(cit_authors_norm[0], bib_authors_norm[0])
        else:
            # Match all authors
            matches = 0
            for cit_author in cit_authors_norm:
                best_match = 0
                for bib_author in bib_authors_norm:
                    similarity = self._calculate_similarity(cit_author, bib_author)
                    best_match = max(best_match, similarity)
                if best_match > 0.8:  # Threshold for considering a match
                    matches += 1

            if len(cit_authors_norm) > 0:
                return matches / len(cit_authors_norm)

        return 0.0

    def load_data(self):
        """Load citations and bibliography from processed files"""
        # Load citations
        citations_path = Path("generated/reports/crv/data/raw/citations.json")
        if not citations_path.exists():
            raise FileNotFoundError(f"Citations file not found: {citations_path}")

        with open(citations_path, 'r', encoding='utf-8') as f:
            citations_data = json.load(f)
            self.citations = citations_data.get('citations', [])

        self.logger.info(f"Loaded {len(self.citations)} citations")

        # Load bibliography
        bibliography_path = Path("generated/reports/crv/data/raw/bibliography.json")
        if not bibliography_path.exists():
            raise FileNotFoundError(f"Bibliography file not found: {bibliography_path}")

        with open(bibliography_path, 'r', encoding='utf-8') as f:
            bibliography_data = json.load(f)
            self.bibliography = bibliography_data.get('entries', [])

            # Build index
            self.bibliography_index = {}
            for entry in self.bibliography:
                # Index by ID
                self.bibliography_index[entry['id']] = entry

                # Index by author-year
                if entry.get('parsed'):
                    year = entry['parsed'].get('year')
                    authors = entry['parsed'].get('authors', [])
                    for author in authors:
                        if isinstance(author, dict):
                            last_name = author.get('last_name')
                            if last_name and year:
                                key = f"{self._normalize_text(last_name)}_{year}"
                                if key not in self.bibliography_index:
                                    self.bibliography_index[key] = []
                                self.bibliography_index[key].append(entry)

        self.logger.info(f"Loaded {len(self.bibliography)} bibliography entries")

    def validate_citation_format(self, citation: Dict) -> Tuple[str, List[str]]:
        """Validate citation format against APA rules"""
        issues = []
        raw_text = citation.get('raw_text', '')
        citation_type = citation.get('type', '')

        # Check parenthetical citations
        if citation_type == 'parenthetical':
            if not re.match(self.apa_rules['citation']['parentheses'], raw_text):
                issues.append("Parenthetical citation missing proper parentheses")

            # Check for proper use of ampersand
            if ' and ' in raw_text:
                issues.append("Use '&' instead of 'and' in parenthetical citations")

        # Check narrative citations
        elif citation_type == 'narrative':
            # Check for proper use of 'and'
            if '&' in raw_text and '(' not in raw_text:
                issues.append("Use 'and' instead of '&' in narrative citations")

        # Check year format
        normalized = citation.get('normalized', {})
        year = normalized.get('year', '')
        if year and not re.match(self.apa_rules['citation']['year_format'], str(year)):
            if year != 'in press':
                issues.append(f"Invalid year format: {year}")

        # Check et al. format
        if 'et al' in raw_text.lower():
            if not re.search(r'et al\.', raw_text):
                issues.append("'et al.' should include a period")

        # Check page number format
        if 'p.' in raw_text or 'pp.' in raw_text:
            if not re.search(self.apa_rules['citation']['page_format'], raw_text):
                issues.append("Page numbers should follow format: p. # or pp. #-#")

        # Determine status
        if len(issues) == 0:
            status = 'valid'
        elif len(issues) <= 2:
            status = 'warning'
        else:
            status = 'invalid'

        return status, issues

    def validate_bibliography_format(self, entry: Dict) -> Tuple[str, List[str]]:
        """Validate bibliography entry format against APA rules"""
        issues = []
        raw_text = entry.get('raw_text', '')

        # Check ending period
        if not re.search(self.apa_rules['bibliography']['ending_period'], raw_text):
            issues.append("Bibliography entry should end with a period")

        # Check year in parentheses
        if not re.search(self.apa_rules['bibliography']['year_parentheses'], raw_text):
            issues.append("Year should be in parentheses: (YYYY)")

        # Check author format (basic check)
        if not re.match(self.apa_rules['bibliography']['author_format'], raw_text):
            # This might be too strict for all cases
            pass  # Don't add as issue for now

        # Check for italics markers (should have them for titles)
        entry_type = entry.get('type', '')
        if entry_type in ['book', 'journal_article'] and '_' not in raw_text:
            issues.append(f"{entry_type.replace('_', ' ').title()} titles should be italicized")

        # Determine status based on existing validation
        existing_status = entry.get('validation_status', 'valid')
        existing_errors = entry.get('errors', [])

        if existing_status == 'invalid' or len(existing_errors) > 0:
            status = 'invalid'
            issues.extend(existing_errors)
        elif len(issues) > 0:
            status = 'warning'
        else:
            status = 'valid'

        return status, issues

    def match_citation_to_bibliography(self, citation: Dict) -> Tuple[Optional[str], float]:
        """Match a citation to bibliography entry"""
        normalized = citation.get('normalized', {})

        # Handle multiple citations
        if 'multiple' in normalized:
            # For now, just validate that each sub-citation exists
            all_found = True
            for sub_citation in normalized['multiple']:
                authors = sub_citation.get('authors', [])
                year = sub_citation.get('year', '')
                match_id, confidence = self._find_single_match(authors, year)
                if not match_id:
                    all_found = False

            if all_found:
                return 'multiple_valid', 0.9
            else:
                return None, 0.0

        # Handle secondary citations
        if citation.get('type') == 'secondary':
            # Only need to verify the cited work exists
            cited_author = normalized.get('cited_in_author', '')
            cited_year = normalized.get('cited_in_year', '')
            if cited_author and cited_year:
                return self._find_single_match([cited_author], cited_year)
            return None, 0.0

        # Handle regular citations
        authors = normalized.get('authors', [])
        year = normalized.get('year', '')

        if not authors or not year:
            return None, 0.0

        return self._find_single_match(authors, year)

    def _find_single_match(self, authors: List[str], year: str) -> Tuple[Optional[str], float]:
        """Find a single bibliography match"""
        best_match = None
        best_confidence = 0.0

        # Try exact match first
        for author in authors:
            if author == 'et al.':
                continue

            key = f"{self._normalize_text(author)}_{year}"
            if key in self.bibliography_index:
                entries = self.bibliography_index[key]
                if entries:
                    # Verify author match
                    for entry in entries:
                        bib_authors = entry.get('parsed', {}).get('authors', [])
                        confidence = self._fuzzy_match_authors(authors, bib_authors)
                        if confidence > best_confidence:
                            best_match = entry['id']
                            best_confidence = confidence

        # If no exact match, try fuzzy matching
        if not best_match:
            for entry in self.bibliography:
                parsed = entry.get('parsed', {})
                bib_year = parsed.get('year', '')

                # Year must match exactly
                if bib_year != year:
                    continue

                bib_authors = parsed.get('authors', [])
                confidence = self._fuzzy_match_authors(authors, bib_authors)

                if confidence > best_confidence and confidence > 0.7:  # Threshold
                    best_match = entry['id']
                    best_confidence = confidence

        return best_match, best_confidence

    def validate_all(self) -> ValidationReport:
        """Validate all citations and bibliography entries"""
        self.validation_results = []

        missing_bibliography = []
        format_violations = []
        citation_stats = {}

        # Validate each citation
        for citation in self.citations:
            # Validate format
            format_status, format_issues = self.validate_citation_format(citation)

            # Match to bibliography
            matched_bib, match_confidence = self.match_citation_to_bibliography(citation)

            # Compile issues
            all_issues = []
            suggestions = []

            # Add format issues
            for issue in format_issues:
                all_issues.append({
                    'type': 'format',
                    'severity': 'warning',
                    'message': issue
                })

            # Check bibliography match
            if not matched_bib:
                all_issues.append({
                    'type': 'missing_bibliography',
                    'severity': 'error',
                    'message': 'No matching bibliography entry found'
                })

                missing_bibliography.append({
                    'citation': citation,
                    'searched_for': {
                        'authors': citation.get('normalized', {}).get('authors', []),
                        'year': citation.get('normalized', {}).get('year', '')
                    }
                })

                # Suggest possible matches
                self._suggest_bibliography_matches(citation, suggestions)

            elif match_confidence < 0.8:
                all_issues.append({
                    'type': 'low_confidence_match',
                    'severity': 'warning',
                    'message': f'Low confidence match ({match_confidence:.2f})'
                })

            # Determine overall status
            if any(issue['severity'] == 'error' for issue in all_issues):
                status = 'invalid'
            elif any(issue['severity'] == 'warning' for issue in all_issues):
                status = 'warning'
            else:
                status = 'valid'

            # Create validation result
            result = ValidationResult(
                citation_id=citation['id'],
                status=status,
                issues=all_issues,
                suggestions=suggestions,
                matched_bibliography=matched_bib,
                confidence=match_confidence if matched_bib else 0.0
            )

            self.validation_results.append(result)

            # Collect format violations
            if format_issues:
                format_violations.append({
                    'citation': citation,
                    'issues': format_issues
                })

            # Update statistics
            cit_key = f"{citation.get('normalized', {}).get('authors', ['Unknown'])[0]}_{citation.get('normalized', {}).get('year', 'Unknown')}"
            citation_stats[cit_key] = citation_stats.get(cit_key, 0) + 1

        # Validate bibliography entries
        bibliography_issues = []
        for entry in self.bibliography:
            bib_status, bib_issues = self.validate_bibliography_format(entry)
            if bib_issues:
                bibliography_issues.append({
                    'entry': entry,
                    'issues': bib_issues
                })

        # Find duplicate citations
        duplicate_citations = []
        for key, count in citation_stats.items():
            if count > 5:  # Threshold for considering as potential duplicate
                duplicate_citations.append({
                    'citation_key': key,
                    'count': count,
                    'suggestion': 'Consider using narrative citations for variety'
                })

        # Compile report
        valid_count = sum(1 for r in self.validation_results if r.status == 'valid')
        invalid_count = sum(1 for r in self.validation_results if r.status == 'invalid')
        warning_count = sum(1 for r in self.validation_results if r.status == 'warning')

        report = ValidationReport(
            total_citations=len(self.citations),
            valid_citations=valid_count,
            invalid_citations=invalid_count,
            warnings=warning_count,
            missing_bibliography=missing_bibliography,
            format_violations=format_violations,
            duplicate_citations=duplicate_citations,
            statistics={
                'total_bibliography_entries': len(self.bibliography),
                'bibliography_with_issues': len(bibliography_issues),
                'unique_citations': len(citation_stats),
                'most_cited': max(citation_stats.items(), key=lambda x: x[1]) if citation_stats else None
            }
        )

        self.logger.info(f"Validation complete: {valid_count} valid, {invalid_count} invalid, {warning_count} warnings")

        return report

    def _suggest_bibliography_matches(self, citation: Dict, suggestions: List[str]):
        """Suggest possible bibliography matches for unmatched citation"""
        normalized = citation.get('normalized', {})
        authors = normalized.get('authors', [])
        year = normalized.get('year', '')

        # Look for similar years
        if year:
            year_num = re.search(r'\d{4}', str(year))
            if year_num:
                year_val = int(year_num.group())
                for y in [year_val - 1, year_val + 1]:
                    key_pattern = f"_{y}"
                    for key in self.bibliography_index:
                        if key_pattern in key:
                            suggestions.append(f"Check year {y} in bibliography")
                            break

        # Look for similar author names
        for author in authors:
            if author == 'et al.':
                continue
            author_norm = self._normalize_text(author)
            for entry in self.bibliography:
                bib_authors = entry.get('parsed', {}).get('authors', [])
                for bib_author in bib_authors:
                    if isinstance(bib_author, dict):
                        last_name = bib_author.get('last_name', '')
                        if self._calculate_similarity(author, last_name) > 0.8:
                            suggestions.append(f"Similar author found: {last_name}")
                            break

    def save_validation_results(self, report: ValidationReport):
        """Save validation results to files"""
        # Save JSON report
        json_path = Path("generated/reports/crv/data/processed/validation_results.json")
        json_path.parent.mkdir(parents=True, exist_ok=True)

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'report': report.to_dict(),
                'detailed_results': [r.to_dict() for r in self.validation_results]
            }, f, indent=2, ensure_ascii=False)

        self.logger.info(f"Saved validation results to {json_path}")

        return report

def main():
    """Main execution function"""
    validator = ReferenceValidator()

    try:
        # Load data
        validator.load_data()

        # Perform validation
        report = validator.validate_all()

        # Save results
        validator.save_validation_results(report)

        print("\n" + "="*50)
        print("VALIDATION SUMMARY")
        print("="*50)
        print(f"Total citations: {report.total_citations}")
        print(f"Valid: {report.valid_citations}")
        print(f"Invalid: {report.invalid_citations}")
        print(f"Warnings: {report.warnings}")
        print(f"Missing bibliography entries: {len(report.missing_bibliography)}")
        print(f"Format violations: {len(report.format_violations)}")
        print("="*50)

        print(f"\n✅ Validation complete")
        print(f"Results saved to: generated/reports/crv/data/processed/validation_results.json")

    except Exception as e:
        logging.error(f"Validation failed: {e}")
        raise

if __name__ == "__main__":
    main()