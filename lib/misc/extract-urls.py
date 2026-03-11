#!/usr/bin/env python3
"""
Extract all unique URLs from files in a folder and save them as a JSON array.

Usage: python lib/utils/extract-urls.py <folder_path> <output_file>
Example: python lib/utils/extract-urls.py "research/PDFs" "generated/urls.json"
"""

import sys
import os
import json
import re
from pathlib import Path
from urllib.parse import urlparse


def is_valid_url(url):
    """Check if a string is a valid URL."""
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except Exception:
        return False


def extract_urls_from_text(text):
    """Extract all URLs from a text string."""
    # Pattern to match URLs (http, https, ftp, etc.)
    # This pattern matches URLs with or without protocol
    url_pattern = r'(?:https?|ftp)://[^\s<>"{}|\\^`\[\]]+|(?:www\.)[^\s<>"{}|\\^`\[\]]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s<>"{}|\\^`\[\]]*'
    
    # Find all potential URLs
    matches = re.findall(url_pattern, text)
    
    urls = []
    for match in matches:
        # Clean up the URL (remove trailing punctuation)
        url = match.rstrip('.,;:!?)')
        
        # Add protocol if missing
        if url.startswith('www.'):
            url = 'https://' + url
        elif not url.startswith(('http://', 'https://', 'ftp://')):
            # If it looks like a domain, add https://
            if '.' in url and not url.startswith('mailto:'):
                url = 'https://' + url
        
        # Validate URL
        if is_valid_url(url):
            urls.append(url)
    
    return urls


def extract_urls_from_folder(folder_path, output_path):
    """Extract all unique URLs from all files in a folder."""
    folder = Path(folder_path)
    
    # Check if folder exists
    if not folder.exists():
        print(f"Error: Folder '{folder_path}' not found.")
        print(f"Current working directory: {os.getcwd()}")
        print(f"Absolute path attempted: {folder.absolute()}")
        sys.exit(1)
    
    if not folder.is_dir():
        print(f"Error: '{folder_path}' is not a directory.")
        sys.exit(1)
    
    # Collect all unique URLs
    unique_urls = set()
    files_processed = 0
    files_with_urls = 0
    
    # Iterate through all files in the folder (recursively)
    for file_path in folder.rglob('*'):
        if file_path.is_file():
            try:
                # Try to read as text file
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    urls = extract_urls_from_text(content)
                    
                    if urls:
                        unique_urls.update(urls)
                        files_with_urls += 1
                        print(f"Found {len(urls)} URL(s) in: {file_path.relative_to(folder)}")
                    
                    files_processed += 1
            except Exception as e:
                print(f"Warning: Could not process file '{file_path}': {e}")
                continue
    
    # Convert set to sorted list for consistent output
    sorted_urls = sorted(list(unique_urls))
    
    # Write to output file
    output_file = Path(output_path)
    try:
        # Create parent directories if they don't exist
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sorted_urls, f, indent=2, ensure_ascii=False)
        
        print(f"\nExtraction complete!")
        print(f"Files processed: {files_processed}")
        print(f"Files with URLs: {files_with_urls}")
        print(f"Unique URLs found: {len(sorted_urls)}")
        print(f"Output saved to: {output_file.absolute()}")
    except Exception as e:
        print(f"Error writing to file '{output_path}': {e}")
        sys.exit(1)


def main():
    if len(sys.argv) != 3:
        print("Usage: python lib/utils/extract-urls.py <folder_path> <output_file>")
        print("Example: python lib/utils/extract-urls.py \"research/PDFs\" \"generated/urls.json\"")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    output_path = sys.argv[2]
    
    extract_urls_from_folder(folder_path, output_path)


if __name__ == "__main__":
    main()

