#!/usr/bin/env python3
"""
APA Validator Agent
Claude Code agent for intelligent APA citation validation
Handles complex cases and provides smart suggestions
"""

import re
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import unicodedata

class APAValidatorAgent:
    """
    Intelligent APA validation agent for handling complex citation cases
    This agent uses contextual understanding to validate and correct citations
    """

    def __init__(self):
        self.complex_patterns = {
            'indirect_citation': [
                r'(?:according to|as cited by|as mentioned by|siguiendo a|según)\s+([A-Z][a-z]+)',
                r'([A-Z][a-z]+)\s+(?:argues|suggests|states|proposes|afirma|sugiere)\s+that',
                r'(?:In the words of|En palabras de)\s+([A-Z][a-z]+)'
            ],
            'organizational_author': [
                r'\((?:WHO|UNESCO|UN|OMS|ONU|APA|IEEE|ACM)[,\s]+\d{4}\)',
                r'\((?:World Health Organization|United Nations|Organización Mundial)[,\s]+\d{4}\)'
            ],
            'legal_citation': [
                r'(?:Article|Section|Artículo|Sección)\s+\d+',
                r'(?:Law|Act|Ley|Acta)\s+\d+/\d{4}'
            ],
            'personal_communication': [
                r'personal communication|comunicación personal',
                r'(?:email|interview|conversation|correo|entrevista)'
            ]
        }

        self.contextual_rules = {
            'quote_attribution': {
                'pattern': r'"[^"]{20,}"\s*\([^)]+\)',
                'rule': 'Long quotes should include page numbers'
            },
            'multiple_same_author': {
                'pattern': r'\(([A-Z][a-z]+),\s*\d{4}[a-z]\)',
                'rule': 'Use letters (a, b, c) to distinguish multiple works by same author in same year'
            },
            'group_author_acronym': {
                'pattern': r'\(([A-Z]{2,}),\s*\d{4}\)',
                'rule': 'First mention should spell out organization name'
            }
        }

    def analyze_context(self, citation_text: str, surrounding_text: str) -> Dict[str, any]:
        """
        Analyze citation in context to understand its type and validate appropriateness
        """
        analysis = {
            'citation_type': 'standard',
            'context_appropriate': True,
            'suggestions': [],
            'confidence': 1.0
        }

        # Check if this is a quote needing page numbers
        if '"' in surrounding_text and citation_text in surrounding_text:
            quote_before = surrounding_text[:surrounding_text.find(citation_text)]
            if '"' in quote_before and not re.search(r'p\.\s*\d+', citation_text):
                analysis['suggestions'].append({
                    'issue': 'missing_page_number',
                    'suggestion': 'Add page number for direct quote (e.g., p. 123)',
                    'severity': 'warning'
                })
                analysis['confidence'] *= 0.9

        # Check for indirect citations
        text_before = surrounding_text[:max(0, surrounding_text.find(citation_text))]
        for pattern in self.complex_patterns['indirect_citation']:
            if re.search(pattern, text_before, re.IGNORECASE):
                analysis['citation_type'] = 'indirect'
                # Suggest narrative format
                if citation_text.startswith('('):
                    analysis['suggestions'].append({
                        'issue': 'format_mismatch',
                        'suggestion': 'Consider narrative format for indirect citations',
                        'severity': 'info'
                    })
                break

        # Check for organizational authors
        for pattern in self.complex_patterns['organizational_author']:
            if re.search(pattern, citation_text):
                analysis['citation_type'] = 'organizational'
                # Check if first occurrence
                if surrounding_text.count(citation_text) == 1:
                    analysis['suggestions'].append({
                        'issue': 'org_author_format',
                        'suggestion': 'Spell out organization name on first citation',
                        'severity': 'info'
                    })
                break

        # Check for personal communications
        for pattern in self.complex_patterns['personal_communication']:
            if re.search(pattern, citation_text, re.IGNORECASE):
                analysis['citation_type'] = 'personal_communication'
                analysis['suggestions'].append({
                    'issue': 'personal_comm_note',
                    'suggestion': 'Personal communications should not appear in reference list',
                    'severity': 'info'
                })
                break

        # Context appropriateness checks
        self._check_context_flow(citation_text, surrounding_text, analysis)

        return analysis

    def _check_context_flow(self, citation_text: str, surrounding_text: str, analysis: Dict):
        """Check if citation placement flows well in context"""
        # Check for awkward placement
        if surrounding_text.startswith(citation_text):
            analysis['suggestions'].append({
                'issue': 'citation_placement',
                'suggestion': 'Avoid starting sentences with parenthetical citations',
                'severity': 'style'
            })
            analysis['context_appropriate'] = False

        # Check for citation clustering
        citations_in_context = re.findall(r'\([^)]+\d{4}[^)]*\)', surrounding_text)
        if len(citations_in_context) > 3:
            analysis['suggestions'].append({
                'issue': 'citation_clustering',
                'suggestion': 'Consider consolidating multiple citations: (Author1, 2020; Author2, 2021)',
                'severity': 'style'
            })

    def suggest_correction(self, invalid_citation: Dict) -> List[Dict[str, str]]:
        """
        Provide intelligent corrections for invalid citations
        """
        corrections = []
        raw_text = invalid_citation.get('raw_text', '')
        normalized = invalid_citation.get('normalized', {})

        # Missing parentheses
        if not raw_text.startswith('(') and '(' not in raw_text:
            corrections.append({
                'original': raw_text,
                'corrected': f"({raw_text})",
                'explanation': "Add parentheses for parenthetical citation"
            })

        # Fix et al. punctuation
        if 'et al' in raw_text and 'et al.' not in raw_text:
            corrected = re.sub(r'et al(?!\.)', 'et al.', raw_text)
            corrections.append({
                'original': raw_text,
                'corrected': corrected,
                'explanation': "'et al.' requires a period"
            })

        # Fix ampersand usage
        if invalid_citation.get('type') == 'parenthetical' and ' and ' in raw_text:
            corrected = raw_text.replace(' and ', ' & ')
            corrections.append({
                'original': raw_text,
                'corrected': corrected,
                'explanation': "Use '&' in parenthetical citations"
            })
        elif invalid_citation.get('type') == 'narrative' and ' & ' in raw_text:
            corrected = raw_text.replace(' & ', ' and ')
            corrections.append({
                'original': raw_text,
                'corrected': corrected,
                'explanation': "Use 'and' in narrative citations"
            })

        # Fix year format
        year = normalized.get('year', '')
        if year and not re.match(r'^\d{4}[a-z]?$', str(year)):
            # Try to extract valid year
            year_match = re.search(r'\d{4}', str(year))
            if year_match:
                corrected = raw_text.replace(str(year), year_match.group())
                corrections.append({
                    'original': raw_text,
                    'corrected': corrected,
                    'explanation': "Standardize year format to YYYY"
                })

        # Add missing comma before year
        if re.search(r'[A-Za-z]\s+\d{4}', raw_text):
            corrected = re.sub(r'([A-Za-z])\s+(\d{4})', r'\1, \2', raw_text)
            corrections.append({
                'original': raw_text,
                'corrected': corrected,
                'explanation': "Add comma before year"
            })

        return corrections

    def validate_special_cases(self, citation: Dict, context: Optional[str] = None) -> Dict[str, any]:
        """
        Handle special APA citation cases that require intelligent interpretation
        """
        validation = {
            'is_special_case': False,
            'case_type': None,
            'valid': True,
            'notes': []
        }

        raw_text = citation.get('raw_text', '')
        normalized = citation.get('normalized', {})

        # Secondary sources ("as cited in")
        if 'as cited in' in raw_text or 'citado en' in raw_text:
            validation['is_special_case'] = True
            validation['case_type'] = 'secondary_source'
            validation['notes'].append("Secondary source: only cite the work you actually read in references")

            # Validate format
            if not re.search(r'\(.+?,\s*\d{4},?\s*(?:as cited in|citado en)\s+.+?,\s*\d{4}\)', raw_text):
                validation['valid'] = False
                validation['notes'].append("Format should be: (Original Author, Year, as cited in Secondary Author, Year)")

        # Group authors with abbreviations
        elif re.search(r'\([A-Z]{2,}[,\s]+\d{4}\)', raw_text):
            validation['is_special_case'] = True
            validation['case_type'] = 'group_author_abbreviation'
            validation['notes'].append("Group author abbreviation: ensure full name given on first citation")

        # Multiple works same author/year
        elif re.search(r'\d{4}[a-z]', raw_text):
            validation['is_special_case'] = True
            validation['case_type'] = 'multiple_same_year'
            validation['notes'].append("Multiple works same year: use lowercase letters (a, b, c) consistently")

        # Personal communications
        elif 'personal communication' in raw_text or 'comunicación personal' in raw_text:
            validation['is_special_case'] = True
            validation['case_type'] = 'personal_communication'
            validation['valid'] = True  # These don't need bibliography entries
            validation['notes'].append("Personal communications are cited in text only, not in reference list")

            # Check format
            if not re.search(r'[A-Z]\.\s+[A-Z][a-z]+,?\s*(?:personal communication|comunicación personal)', raw_text):
                validation['notes'].append("Format should include initials: (J. Smith, personal communication, Date)")

        # Legal/government documents
        elif re.search(r'(?:Article|Section|Law|Act|Resolution)', raw_text, re.IGNORECASE):
            validation['is_special_case'] = True
            validation['case_type'] = 'legal_document'
            validation['notes'].append("Legal citations may follow different format conventions")

        # Classical works
        elif re.search(r'(?:trans\.|Trans\.|trad\.|ed\.)', raw_text):
            validation['is_special_case'] = True
            validation['case_type'] = 'classical_work'
            validation['notes'].append("Classical works: include original year and translation/edition year")

        return validation

    def generate_smart_suggestion(self, issue_type: str, context: Dict) -> str:
        """
        Generate context-aware suggestions for common issues
        """
        suggestions_map = {
            'missing_bibliography': {
                'default': "Add entry to bibliography or verify author name/year spelling",
                'near_match': "Check similar entry: {similar_entry}",
                'year_off': "Check adjacent years - might be {suggested_year}"
            },
            'format_violation': {
                'parentheses': "Ensure proper parentheses: ({content})",
                'ampersand': "Use '&' in parenthetical, 'and' in narrative citations",
                'et_al': "Format as 'et al.' with period",
                'page_numbers': "Use 'p.' for single page, 'pp.' for range"
            },
            'style_improvement': {
                'repetitive': "Vary citation style - alternate between parenthetical and narrative",
                'clustering': "Combine multiple citations: (Author1, 2020; Author2, 2021)",
                'placement': "Integrate citation within sentence for better flow"
            }
        }

        category = issue_type.split('_')[0] if '_' in issue_type else 'default'

        if category in suggestions_map:
            specific = suggestions_map[category].get(issue_type, suggestions_map[category].get('default', ''))

            # Format with context if available
            if context and '{' in specific:
                try:
                    return specific.format(**context)
                except KeyError:
                    return specific

            return specific

        return "Review APA 7th edition guidelines for this citation type"

    def batch_validate(self, citations: List[Dict], bibliography: List[Dict]) -> Dict[str, any]:
        """
        Validate multiple citations with pattern recognition across the batch
        """
        batch_report = {
            'total_processed': len(citations),
            'patterns_found': [],
            'systematic_issues': [],
            'recommendations': []
        }

        # Track patterns
        author_year_frequency = {}
        citation_types = {}
        error_patterns = {}

        for citation in citations:
            # Count author-year combinations
            normalized = citation.get('normalized', {})
            authors = normalized.get('authors', [])
            year = normalized.get('year', '')

            if authors and year:
                key = f"{authors[0] if authors else 'Unknown'}_{year}"
                author_year_frequency[key] = author_year_frequency.get(key, 0) + 1

            # Track citation types
            cit_type = citation.get('type', 'unknown')
            citation_types[cit_type] = citation_types.get(cit_type, 0) + 1

        # Identify patterns
        # Over-citation of single source
        for key, count in author_year_frequency.items():
            if count > 10:
                batch_report['patterns_found'].append({
                    'pattern': 'over_citation',
                    'details': f"{key} cited {count} times",
                    'recommendation': "Consider diversifying sources or using narrative citations for variety"
                })

        # Citation type imbalance
        total_citations = sum(citation_types.values())
        for cit_type, count in citation_types.items():
            percentage = (count / total_citations) * 100 if total_citations > 0 else 0
            if percentage > 80:
                batch_report['systematic_issues'].append({
                    'issue': 'citation_type_imbalance',
                    'details': f"{cit_type} citations comprise {percentage:.1f}% of total",
                    'recommendation': "Vary citation styles for better readability"
                })

        # Generate overall recommendations
        if len(batch_report['patterns_found']) > 0:
            batch_report['recommendations'].append("Review citation distribution to ensure balanced sourcing")

        if len(batch_report['systematic_issues']) > 0:
            batch_report['recommendations'].append("Consider systematic revision of citation formatting")

        return batch_report

def main():
    """
    Standalone execution for testing the agent
    """
    agent = APAValidatorAgent()

    # Example usage
    test_citation = {
        'raw_text': '(Smith et al 2023)',
        'normalized': {'authors': ['Smith', 'et al.'], 'year': '2023'},
        'type': 'parenthetical'
    }

    test_context = 'According to recent research (Smith et al 2023), the results show...'

    # Analyze context
    analysis = agent.analyze_context(test_citation['raw_text'], test_context)
    print("Context Analysis:", json.dumps(analysis, indent=2))

    # Suggest corrections
    corrections = agent.suggest_correction(test_citation)
    print("\nSuggested Corrections:", json.dumps(corrections, indent=2))

    # Validate special cases
    special = agent.validate_special_cases(test_citation, test_context)
    print("\nSpecial Case Validation:", json.dumps(special, indent=2))

if __name__ == "__main__":
    main()