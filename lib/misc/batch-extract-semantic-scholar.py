#!/usr/bin/env python3
"""
Batch process Semantic Scholar URLs and extract BibTeX citation data.

This script reads URLs from semanticscholar/semantic_urls.md, runs the
extract-semantic-scholar-bibtex.py script for each URL, and stores results
in semantic_urls.json (successes) and semantic_errors.json (errors with URLs).
"""

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List


def read_urls_from_file(file_path: str) -> List[str]:
    """Read URLs from a markdown file (one URL per line)."""
    urls = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and line.startswith('http'):
                urls.append(line)
    return urls


def extract_citation_data(url: str, script_path: str) -> Dict:
    """Run the extract script for a single URL and return the result."""
    try:
        # Run the extract script as a subprocess
        result = subprocess.run(
            [sys.executable, script_path, url],
            capture_output=True,
            text=True,
            timeout=30,
            check=True
        )
        
        # Parse the JSON output
        output = result.stdout.strip()
        if not output:
            return {
                'success': False,
                'error': 'No output from script',
                'url': url
            }
        
        data = json.loads(output)
        # Ensure URL is included in the result
        data['url'] = url
        return data
    
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Script execution timed out',
            'url': url
        }
    except subprocess.CalledProcessError as e:
        return {
            'success': False,
            'error': f'Script execution failed: {e.stderr}',
            'url': url
        }
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse JSON output: {e}',
            'url': url
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'url': url
        }


def main():
    """Main entry point."""
    # Get the script directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Define paths
    urls_file = project_root / 'semanticscholar' / 'semantic_urls.md'
    extract_script = script_dir / 'extract-semantic-scholar-bibtex.py'
    output_dir = project_root / 'semanticscholar'
    success_file = output_dir / 'semantic_urls.json'
    error_file = output_dir / 'semantic_errors.json'
    
    # Check if files exist
    if not urls_file.exists():
        print(f"Error: URLs file not found: {urls_file}")
        sys.exit(1)
    
    if not extract_script.exists():
        print(f"Error: Extract script not found: {extract_script}")
        sys.exit(1)
    
    # Read URLs
    print(f"Reading URLs from {urls_file}...")
    urls = read_urls_from_file(str(urls_file))
    print(f"Found {len(urls)} URLs to process")
    
    # Process URLs
    successes = []
    errors = []
    
    import time
    import random

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] Processing: {url}")
        result = extract_citation_data(url, str(extract_script))
        
        if result.get('success'):
            # Remove 'success' and 'url' from the result for cleaner output
            success_data = {k: v for k, v in result.items() if k not in ('success', 'url')}
            success_data['url'] = url  # Keep URL for reference
            successes.append(success_data)
            print(f"  ✓ Success")
        else:
            errors.append({
                'url': url,
                'error': result.get('error', 'Unknown error')
            })
            print(f"  ✗ Error: {result.get('error', 'Unknown error')}")
        
        # Add delay to avoid rate limiting
        sleep_time = random.uniform(2.5, 4.5)  # jittered delay between requests
        print(f"  Sleeping {sleep_time:.2f} seconds to mitigate rate limiting...")
        time.sleep(sleep_time)
    
    # Ensure output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Write results
    print(f"\nWriting results...")
    with open(success_file, 'w', encoding='utf-8') as f:
        json.dump(successes, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Successes written to: {success_file} ({len(successes)} entries)")
    
    with open(error_file, 'w', encoding='utf-8') as f:
        json.dump(errors, f, indent=2, ensure_ascii=False)
    print(f"  ✓ Errors written to: {error_file} ({len(errors)} entries)")
    
    print(f"\nSummary:")
    print(f"  Total URLs: {len(urls)}")
    print(f"  Successful: {len(successes)}")
    print(f"  Errors: {len(errors)}")


if __name__ == '__main__':
    main()

