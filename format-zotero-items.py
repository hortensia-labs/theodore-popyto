#!/usr/bin/env python3
"""
Transform zotero-items.json to a simplified format.

Converts from:
    "ID": {
        "key": "ITEMKEY",
        "title": "...",
        "url": "...",
        "citation": "...",
        ...
    }

To:
    "ITEMKEY": {
        "url": "...",
        "citation": "..."
    }
"""

import json
from pathlib import Path


def transform_items(input_file: Path) -> dict:
    """
    Transform zotero items to simplified format.
    
    Returns a dictionary keyed by item keys with only url and citation.
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    formatted_items = {}
    
    for item_id, item_data in data.items():
        # Skip metadata fields (non-dictionary entries)
        if not isinstance(item_data, dict):
            continue
        
        # Get the item key
        item_key = item_data.get('key')
        if not item_key:
            print(f"Warning: Item {item_id} has no key, skipping")
            continue
        
        # Extract only url and citation
        formatted_items[item_key] = {
            "url": item_data.get('url', ''),
            "citation": item_data.get('citation', '')
        }
    
    return formatted_items


def main():
    """Main execution function."""
    input_file = Path('zotero-items.json')
    output_file = Path('zotero-items-formatted.json')
    
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        return
    
    print(f"Reading {input_file}...")
    formatted_items = transform_items(input_file)
    
    # Write results
    print(f"Writing {len(formatted_items)} items to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(formatted_items, f, indent=4, ensure_ascii=False)
    
    print(f"✓ Successfully formatted {len(formatted_items)} items")
    print(f"✓ Saved to {output_file}")
    
    # Show a sample
    sample_keys = list(formatted_items.keys())[:3]
    if sample_keys:
        print("\nSample output:")
        for key in sample_keys:
            item = formatted_items[key]
            print(f"\n  {key}:")
            print(f"    url: {item['url'][:60]}..." if len(item['url']) > 60 else f"    url: {item['url']}")
            print(f"    citation: {item['citation']}")


if __name__ == '__main__':
    main()
