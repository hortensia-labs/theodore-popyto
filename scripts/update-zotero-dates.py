#!/usr/bin/env python3
"""
Update Zotero item dates via the custom Citation Linker API.

This script reads the zotero-incomplete-items.json file and updates
each item's date field in Zotero using the POST endpoint.
"""

import json
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Dict, List, Tuple


# API Configuration
API_ENDPOINT = "http://localhost:23119/citationlinker/edititem"
REQUEST_TIMEOUT = 30  # seconds
RETRY_DELAY = 1  # seconds between retries
MAX_RETRIES = 3


def update_item_date(item_key: str, date: str, retry_count: int = 0) -> Tuple[bool, str]:
    """
    Update a single item's date in Zotero.
    
    Args:
        item_key: The Zotero item key
        date: The date to set
        retry_count: Current retry attempt number
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    payload = {
        "itemKey": item_key,
        "fields": {
            "date": date
        }
    }
    
    try:
        # Prepare the request
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            API_ENDPOINT,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        # Make the request
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            if response.status == 200:
                return True, "Success"
            else:
                response_text = response.read().decode('utf-8')[:100]
                return False, f"HTTP {response.status}: {response_text}"
    
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False, f"Item not found (404)"
        elif e.code >= 500 and retry_count < MAX_RETRIES:
            # Server error - retry
            time.sleep(RETRY_DELAY)
            return update_item_date(item_key, date, retry_count + 1)
        else:
            error_text = e.read().decode('utf-8')[:100] if e.fp else str(e)
            return False, f"HTTP {e.code}: {error_text}"
    
    except urllib.error.URLError as e:
        return False, "Connection error - is the Citation Linker service running?"
    except TimeoutError:
        return False, "Request timed out"
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"


def update_all_items(input_file: Path) -> Dict:
    """
    Update all items from the JSON file.
    
    Returns:
        Dictionary with update statistics
    """
    # Load the items
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Filter out metadata fields and get only items with dates
    items_to_update = []
    for item_id, item_data in data.items():
        if isinstance(item_data, dict) and 'key' in item_data and 'date' in item_data:
            items_to_update.append({
                'id': item_id,
                'key': item_data['key'],
                'title': item_data.get('title', 'Unknown'),
                'date': item_data['date']
            })
    
    total = len(items_to_update)
    successful = []
    failed = []
    
    print(f"Found {total} items to update\n")
    print("=" * 80)
    
    # Update each item
    for idx, item in enumerate(items_to_update, 1):
        item_key = item['key']
        date = item['date']
        title = item['title']
        
        # Truncate title for display
        display_title = title[:60] + "..." if len(title) > 60 else title
        
        print(f"[{idx}/{total}] Updating {item_key}: {display_title}")
        print(f"         Date: {date}")
        
        success, message = update_item_date(item_key, date)
        
        if success:
            print(f"         ✓ {message}")
            successful.append(item)
        else:
            print(f"         ✗ {message}")
            failed.append({**item, 'error': message})
        
        print()
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.1)
    
    return {
        'total': total,
        'successful': successful,
        'failed': failed
    }


def save_failed_items(failed_items: List[Dict], output_file: Path):
    """Save failed items to a file for later review."""
    if not failed_items:
        return
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(failed_items, f, indent=4, ensure_ascii=False)
    
    print(f"Failed items saved to {output_file}")


def main():
    """Main execution function."""
    input_file = Path('zotero-incomplete-items.json')
    failed_file = Path('zotero-update-failed.json')
    
    # Check if input file exists
    if not input_file.exists():
        print(f"Error: {input_file} not found!")
        return
    
    # Check if API is accessible
    print("Checking API connectivity...")
    try:
        req = urllib.request.Request("http://localhost:23119/citationlinker/all-items")
        with urllib.request.urlopen(req, timeout=5) as response:
            print("✓ API is accessible\n")
    except urllib.error.URLError:
        print("✗ Cannot connect to http://localhost:23119/")
        print("  Please ensure the Citation Linker service is running.")
        return
    except Exception as e:
        print(f"⚠ Warning: Could not verify API status: {e}\n")
    
    # Update all items
    print(f"Reading {input_file}...\n")
    results = update_all_items(input_file)
    
    # Print summary
    print("=" * 80)
    print("\nSUMMARY")
    print("=" * 80)
    print(f"Total items processed: {results['total']}")
    print(f"Successfully updated:  {len(results['successful'])} ✓")
    print(f"Failed:                {len(results['failed'])} ✗")
    
    # Save failed items if any
    if results['failed']:
        print()
        save_failed_items(results['failed'], failed_file)
        print("\nFailed items:")
        for item in results['failed']:
            print(f"  - {item['key']}: {item['error']}")
    else:
        print("\n🎉 All items updated successfully!")


if __name__ == '__main__':
    main()
