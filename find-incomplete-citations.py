#!/usr/bin/env python3
"""
Find Zotero items with incomplete citations.

This script identifies items where:
- The citation field is empty or missing
- The citation lacks a date/year
"""

import json
import re
from pathlib import Path


def has_year_in_citation(citation: str) -> bool:
    """Check if a citation contains a year (4-digit number)."""
    if not citation:
        return False
    # Look for a 4-digit year pattern (typically 1900-2099)
    year_pattern = r'\b(19|20)\d{2}\b'
    return bool(re.search(year_pattern, citation))


def find_incomplete_items(input_file: Path) -> dict:
    """
    Find items with incomplete citations.
    
    Returns a dictionary of items where citation is empty or lacks a date.
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    incomplete_items = {}
    
    for item_id, item_data in data.items():
        # Skip metadata fields (non-dictionary entries)
        if not isinstance(item_data, dict):
            continue
        
        citation = item_data.get('citation', '')
        
        # Check if citation is empty or None
        if not citation or citation.strip() == '':
            incomplete_items[item_id] = {
                **item_data,
                'issue': 'empty_citation'
            }
            continue
        
        # Check if citation lacks a year
        if not has_year_in_citation(citation):
            incomplete_items[item_id] = {
                **item_data,
                'issue': 'missing_year_in_citation'
            }
        
        # Check if has url
        if not item_data.get('url'):
            incomplete_items[item_id] = {
                **item_data,
                'issue': 'missing_url'
            }
    
    return incomplete_items


def main():
    """Main execution function."""
    input_file = Path('zotero-items.json')
    output_file = Path('zotero-incomplete-items.json')
    
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        return
    
    print(f"Reading {input_file}...")
    incomplete_items = find_incomplete_items(input_file)
    
    # Write results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(incomplete_items, f, indent=4, ensure_ascii=False)
    
    # Print summary
    print(f"\nFound {len(incomplete_items)} items with incomplete citations")
    
    # Count by issue type
    empty_citations = sum(1 for item in incomplete_items.values() 
                         if item.get('issue') == 'empty_citation')
    missing_years = sum(1 for item in incomplete_items.values() 
                       if item.get('issue') == 'missing_year_in_citation')
    
    print(f"  - Empty citations: {empty_citations}")
    print(f"  - Missing year in citation: {missing_years}")
    print(f"\nResults saved to {output_file}")


if __name__ == '__main__':
    main()
