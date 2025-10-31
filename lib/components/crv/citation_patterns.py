#!/usr/bin/env python3
"""
Citation and Bibliography Pattern Configuration
APA 7th Edition Style

This module contains all regex patterns for extracting and validating
APA citations and bibliography entries.
"""

# Citation extraction patterns
CITATION_PATTERNS = {
    'standard': [
        {
            'name': 'single_author',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*),?\s*(\d{4}[a-z]?)\)',
            'type': 'parenthetical',
            'description': 'Single author: (Smith, 2023)'
        },
        {
            'name': 'two_authors',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s*[&y]\s*([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*),?\s*(\d{4}[a-z]?)\)',
            'type': 'parenthetical',
            'description': 'Two authors: (Smith & Jones, 2023)'
        },
        {
            'name': 'et_al',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s+et\s+al\.,?\s*(\d{4}[a-z]?)\)',
            'type': 'parenthetical',
            'description': 'Multiple authors: (Smith et al., 2023)'
        }
    ],

    'narrative': [
        {
            'name': 'narrative_single',
            'pattern': r'([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s+\((\d{4}[a-z]?)\)',
            'type': 'narrative',
            'description': 'Narrative single: Smith (2023)'
        },
        {
            'name': 'narrative_two',
            'pattern': r'([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s+[yand&]\s+([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s+\((\d{4}[a-z]?)\)',
            'type': 'narrative',
            'description': 'Narrative two authors: Smith and Jones (2023)'
        },
        {
            'name': 'narrative_et_al',
            'pattern': r'([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*)\s+et\s+al\.\s+\((\d{4}[a-z]?)\)',
            'type': 'narrative',
            'description': 'Narrative multiple: Smith et al. (2023)'
        }
    ],

    'with_pages': [
        {
            'name': 'with_page',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\',\s&]+),?\s*(\d{4}[a-z]?),?\s*pp?\.\s*(\d+(?:-\d+)?)\)',
            'type': 'with_pages',
            'description': 'With page: (Smith, 2023, p. 15)'
        },
        {
            'name': 'with_paragraph',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\',\s&]+),?\s*(\d{4}[a-z]?),?\s*(?:para|párr?)\.\s*(\d+)\)',
            'type': 'with_paragraph',
            'description': 'With paragraph: (Smith, 2023, para. 4)'
        }
    ],

    'complex': [
        {
            'name': 'multiple_works_same_author',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*),?\s*(\d{4}[a-z]?(?:,\s*\d{4}[a-z]?)+)\)',
            'type': 'multiple_years',
            'description': 'Same author, multiple years: (Smith, 2021, 2023)'
        },
        {
            'name': 'multiple_citations',
            'pattern': r'\(([^;]+;\s*[^)]+)\)',
            'type': 'multiple_citations',
            'description': 'Multiple citations: (Smith, 2023; Jones, 2022)'
        },
        {
            'name': 'quoted_with_citation',
            'pattern': r'"[^"]+"\s*\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\',\s&]+),?\s*(\d{4}[a-z]?),?\s*pp?\.\s*(\d+(?:-\d+)?)\)',
            'type': 'quoted',
            'description': 'Quote with citation: "text" (Smith, 2023, p. 15)'
        }
    ],

    'special': [
        {
            'name': 'personal_communication',
            'pattern': r'\(([A-Z]\.\s*[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+),?\s*(?:personal\s+communication|comunicación\s+personal),?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})\)',
            'type': 'personal_communication',
            'description': 'Personal communication: (J. Smith, personal communication, January 15, 2023)'
        },
        {
            'name': 'secondary_source',
            'pattern': r'\(([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*),?\s*(\d{4}[a-z]?),?\s*(?:as\s+cited\s+in|citado\s+en)\s+([A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+(?:\s+[A-Z][A-Za-zÁÉÍÓÚáéíóúñÑ\-\']+)*),?\s*(\d{4}[a-z]?)\)',
            'type': 'secondary',
            'description': 'Secondary source: (Smith, 2020, as cited in Jones, 2023)'
        }
    ]
}

# Bibliography entry patterns
BIBLIOGRAPHY_PATTERNS = {
    'journal_article': {
        'pattern': r'^(.+?)\s+\((\d{4}[a-z]?)\)\.\s+(.+?)\.\s+_?([^_]+?)_?,\s*_?(\d+)_?\((\d+)\),\s*(\d+[–-]\d+)',
        'components': ['authors', 'year', 'title', 'journal', 'volume', 'issue', 'pages'],
        'example': 'Smith, J., & Jones, M. (2023). Article title. Journal Name, 15(3), 123-145.'
    },

    'book': {
        'pattern': r'^(.+?)\s+\((\d{4}[a-z]?)\)\.\s+_(.+?)_\.\s+(.+?)\.$',
        'components': ['authors', 'year', 'title', 'publisher'],
        'example': 'Smith, J. (2023). Book title. Publisher Name.'
    },

    'book_chapter': {
        'pattern': r'^(.+?)\s+\((\d{4}[a-z]?)\)\.\s+(.+?)\.\s+(?:In|En)\s+(.+?)\s+\((?:Ed|Eds|Comp)\.\),\s+_(.+?)_\s+\(pp?\.\s*(\d+[–-]\d+)\)\.\s+(.+?)\.$',
        'components': ['authors', 'year', 'chapter_title', 'editors', 'book_title', 'pages', 'publisher'],
        'example': 'Smith, J. (2023). Chapter title. In M. Jones (Ed.), Book title (pp. 123-145). Publisher.'
    },

    'web_resource': {
        'pattern': r'^(.+?)\s+\((\d{4}[a-z]?(?:,\s*[A-Za-z]+\s*\d{1,2})?)\)\.\s+(.+?)\.\s+(?:Retrieved|Recuperado)\s+(?:from|de)\s+(.+)$',
        'components': ['authors', 'date', 'title', 'url'],
        'example': 'Smith, J. (2023, January 15). Web page title. Retrieved from https://example.com'
    },

    'dissertation': {
        'pattern': r'^(.+?)\s+\((\d{4}[a-z]?)\)\.\s+_(.+?)_\s+\[([^\]]+)\]\.\s+(.+?)\.$',
        'components': ['author', 'year', 'title', 'type', 'institution'],
        'example': 'Smith, J. (2023). Title of dissertation [Doctoral dissertation]. University Name.'
    }
}

# Validation rules
VALIDATION_RULES = {
    'citation_format': {
        'required_elements': ['author_or_authors', 'year'],
        'optional_elements': ['page_numbers', 'paragraph_numbers']
    },

    'bibliography_format': {
        'required_elements': ['authors', 'year', 'title', 'source'],
        'punctuation': [
            'ends_with_period',
            'year_in_parentheses',
            'title_case_for_articles',
            'italics_for_journals_and_books'
        ]
    }
}

# Normalization rules
NORMALIZATION = {
    'authors': [
        'remove_extra_spaces',
        'standardize_ampersands',
        'normalize_et_al'
    ],
    'years': [
        'extract_four_digits',
        'handle_in_press',
        'handle_letters_after_year'
    ],
    'punctuation': [
        'standardize_dashes',
        'normalize_quotes',
        'fix_spacing'
    ]
}

# APA validation regex patterns
APA_RULES = {
    'citation': {
        'parentheses': r'^\([^)]+\)$',
        'year_format': r'\d{4}[a-z]?',
        'et_al_format': r'et al\.',
        'ampersand_usage': r'[&]',  # Should use & in parenthetical
        'and_usage': r'\band\b',     # Should use 'and' in narrative
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

def get_all_citation_patterns():
    """Get all citation patterns as a flat list"""
    all_patterns = []
    for category in CITATION_PATTERNS.values():
        all_patterns.extend(category)
    return all_patterns

def get_citation_patterns_by_type(pattern_type):
    """Get citation patterns by type (e.g., 'parenthetical', 'narrative')"""
    patterns = []
    for category in CITATION_PATTERNS.values():
        patterns.extend([p for p in category if p.get('type') == pattern_type])
    return patterns

def get_bibliography_pattern(entry_type):
    """Get bibliography pattern for a specific entry type"""
    return BIBLIOGRAPHY_PATTERNS.get(entry_type, {})

# For backward compatibility with YAML-based code
def get_config():
    """Return configuration in a format similar to the old YAML structure"""
    return {
        'citation_patterns': CITATION_PATTERNS,
        'bibliography_patterns': BIBLIOGRAPHY_PATTERNS,
        'validation_rules': VALIDATION_RULES,
        'normalization': NORMALIZATION
    }