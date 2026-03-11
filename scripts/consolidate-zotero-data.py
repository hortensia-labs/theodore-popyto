#!/usr/bin/env python3
"""
Consolidate Zotero data from formatted items and URL links into a single data.json file.

This script reads:
- zotero-items-formatted.json: Maps item keys to URLs and citations
- zotero-url-links.json: Maps URLs to item keys

And produces:
- data.json: Maps URLs to {key, citation}
"""

import json
from pathlib import Path


def main():
    # Define file paths
    items_formatted_path = Path("zotero-items-formatted.json")
    url_links_path = Path("zotero-url-links.json")
    output_path = Path("data.json")

    # Read zotero-items-formatted.json
    print(f"Reading {items_formatted_path}...")
    with open(items_formatted_path, "r", encoding="utf-8") as f:
        items_formatted = json.load(f)
    
    # Read zotero-url-links.json
    print(f"Reading {url_links_path}...")
    with open(url_links_path, "r", encoding="utf-8") as f:
        url_links = json.load(f)
    
    # Create the consolidated data structure
    print("Consolidating data...")
    consolidated_data = {}
    
    # Track statistics
    processed = 0
    missing_keys = []
    
    # For each URL in url_links, get its key and look up the citation
    for url, url_data in url_links.items():
        item_key = url_data.get("key")
        
        if not item_key:
            print(f"Warning: No key found for URL: {url}")
            continue
        
        # Look up the citation from items_formatted
        if item_key in items_formatted:
            citation = items_formatted[item_key].get("citation")
            
            consolidated_data[url] = {
                "key": item_key,
                "citation": citation
            }
            processed += 1
        else:
            missing_keys.append((url, item_key))
    
    # Report statistics
    print(f"\nProcessed {processed} URLs successfully")
    
    if missing_keys:
        print(f"Warning: {len(missing_keys)} URLs have keys not found in items_formatted:")
        for url, key in missing_keys[:5]:  # Show first 5
            print(f"  - URL: {url}")
            print(f"    Key: {key}")
        if len(missing_keys) > 5:
            print(f"  ... and {len(missing_keys) - 5} more")
    
    # Write the consolidated data
    print(f"\nWriting consolidated data to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(consolidated_data, f, indent=4, ensure_ascii=False)
    
    print(f"✓ Successfully created {output_path} with {len(consolidated_data)} entries")


if __name__ == "__main__":
    main()
