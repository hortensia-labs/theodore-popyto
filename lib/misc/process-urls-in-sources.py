#!/usr/bin/env python3
"""
Process URLs from source files in sections and generate analysis reports.

This script:
1. Scans all files in sections/[section-name]/sources folders
2. Extracts and deduplicates URLs
3. Analyzes URLs via citation linker API
4. Generates reports in sections/[section-name]/references/urls-report.json

Progress is output to stdout as JSON lines for streaming to Node.js API routes.

Usage: python lib/process-urls-in-sources.py
"""

import sys
import os
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

try:
    import requests
except ImportError:
    print(json.dumps({"type": "error", "message": "'requests' library is required. Install it with: pip install requests"}))
    sys.exit(1)


def emit_progress(progress_type, **kwargs):
    """
    Emit a progress update as a JSON line to stdout.
    
    Args:
        progress_type: Type of progress update (e.g., 'extraction', 'analysis', 'complete', 'error')
        **kwargs: Additional data to include in the progress update
    """
    progress_data = {
        "type": progress_type,
        "timestamp": time.time(),
        **kwargs
    }
    print(json.dumps(progress_data), flush=True)


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


def extract_urls_from_section(section_path):
    """
    Extract all unique URLs from source files in a section.
    
    Args:
        section_path: Path to the section directory
    
    Returns:
        tuple: (list of unique URLs, dict with extraction stats)
    """
    sources_dir = section_path / "sources"
    
    if not sources_dir.exists() or not sources_dir.is_dir():
        return [], {"files_found": 0, "files_processed": 0, "files_with_urls": 0}
    
    unique_urls = set()
    files_processed = 0
    files_with_urls = 0
    
    # Get all files in sources directory
    source_files = list(sources_dir.rglob('*'))
    total_files = len([f for f in source_files if f.is_file()])
    
    emit_progress(
        "extraction_start",
        section=section_path.name,
        total_files=total_files
    )
    
    for file_path in source_files:
        if file_path.is_file():
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    urls = extract_urls_from_text(content)
                    
                    if urls:
                        unique_urls.update(urls)
                        files_with_urls += 1
                    
                    files_processed += 1
                    
                    # Emit progress every 5 files
                    if files_processed % 5 == 0 or files_processed == total_files:
                        emit_progress(
                            "extraction_progress",
                            section=section_path.name,
                            files_processed=files_processed,
                            total_files=total_files,
                            unique_urls_count=len(unique_urls)
                        )
            except Exception as e:
                emit_progress(
                    "extraction_warning",
                    section=section_path.name,
                    file=str(file_path),
                    error=str(e)
                )
                continue
    
    stats = {
        "files_found": total_files,
        "files_processed": files_processed,
        "files_with_urls": files_with_urls,
        "unique_urls": len(unique_urls)
    }
    
    emit_progress(
        "extraction_complete",
        section=section_path.name,
        **stats
    )
    
    return sorted(list(unique_urls)), stats


def analyze_url(url, api_endpoint, progress_counter, section_name):
    """
    Make a POST request to analyze a URL.
    
    Returns:
        dict: Contains 'url' and response data, or 'url' and 'error' if request failed
    """
    try:
        response = requests.post(
            api_endpoint,
            json={"url": url},
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                result = {"url": url}
                result.update(response_data)
                
                with progress_counter['lock']:
                    progress_counter['completed'] += 1
                    completed = progress_counter['completed']
                    failed = progress_counter['failed']
                    total = progress_counter['total']
                    
                    # Emit progress update
                    emit_progress(
                        "analysis_progress",
                        section=section_name,
                        completed=completed,
                        failed=failed,
                        total=total,
                        percentage=(completed + failed) / total * 100 if total > 0 else 0
                    )
                
                return result
            except json.JSONDecodeError:
                result = {
                    "url": url,
                    "error": f"Invalid JSON response: {response.text[:200]}",
                    "status_code": response.status_code
                }
                with progress_counter['lock']:
                    progress_counter['failed'] += 1
                return result
        else:
            result = {
                "url": url,
                "error": f"HTTP {response.status_code}: {response.text[:200]}",
                "status_code": response.status_code
            }
            with progress_counter['lock']:
                progress_counter['failed'] += 1
            return result
            
    except requests.exceptions.Timeout:
        result = {
            "url": url,
            "error": "Request timeout"
        }
        with progress_counter['lock']:
            progress_counter['failed'] += 1
        return result
    except requests.exceptions.ConnectionError:
        result = {
            "url": url,
            "error": "Connection error - is the service running at localhost:23119?"
        }
        with progress_counter['lock']:
            progress_counter['failed'] += 1
        return result
    except Exception as e:
        result = {
            "url": url,
            "error": f"Unexpected error: {str(e)}"
        }
        with progress_counter['lock']:
            progress_counter['failed'] += 1
        return result


def analyze_urls(urls, api_endpoint, section_name, max_workers=10):
    """
    Analyze all URLs using parallel requests.
    
    Args:
        urls: List of URLs to analyze
        api_endpoint: API endpoint URL
        section_name: Name of the section being processed
        max_workers: Maximum number of parallel workers
    
    Returns:
        list: Array of results, each containing URL and response data
    """
    if len(urls) == 0:
        return []
    
    emit_progress(
        "analysis_start",
        section=section_name,
        total_urls=len(urls),
        max_workers=max_workers
    )
    
    # Thread-safe progress counter
    progress_counter = {
        'completed': 0,
        'failed': 0,
        'total': len(urls),
        'lock': Lock()
    }
    
    results = []
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {
            executor.submit(analyze_url, url, api_endpoint, progress_counter, section_name): url
            for url in urls
        }
        
        for future in as_completed(future_to_url):
            result = future.result()
            results.append(result)
    
    elapsed_time = time.time() - start_time
    
    emit_progress(
        "analysis_complete",
        section=section_name,
        total_processed=len(results),
        successful=progress_counter['completed'],
        failed=progress_counter['failed'],
        elapsed_time=elapsed_time,
        avg_time_per_url=elapsed_time / len(urls) if len(urls) > 0 else 0
    )
    
    return results


def process_section(section_path, api_endpoint, max_workers=10):
    """
    Process a single section: extract URLs and generate report.
    
    Args:
        section_path: Path to the section directory
        api_endpoint: API endpoint URL
        max_workers: Maximum number of parallel workers for analysis
    """
    section_name = section_path.name
    
    emit_progress(
        "section_start",
        section=section_name
    )
    
    # Extract URLs
    urls, extraction_stats = extract_urls_from_section(section_path)
    
    if len(urls) == 0:
        emit_progress(
            "section_skip",
            section=section_name,
            reason="No URLs found"
        )
        return
    
    # Analyze URLs
    results = analyze_urls(urls, api_endpoint, section_name, max_workers)
    
    # Generate report file
    references_dir = section_path / "references"
    references_dir.mkdir(parents=True, exist_ok=True)
    report_file = references_dir / "urls-report.json"
    
    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        emit_progress(
            "section_complete",
            section=section_name,
            report_file=str(report_file),
            total_urls=len(urls),
            total_results=len(results)
        )
    except Exception as e:
        emit_progress(
            "section_error",
            section=section_name,
            error=f"Failed to write report: {str(e)}"
        )


def main():
    """Main function to process all sections."""
    # Get the project root (assuming script is in lib/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    sections_dir = project_root / "sections"
    
    if not sections_dir.exists():
        emit_progress(
            "error",
            message=f"Sections directory not found: {sections_dir}"
        )
        sys.exit(1)
    
    api_endpoint = "http://localhost:23119/citationlinker/analyzeurl"
    
    # Find all section directories
    section_dirs = [d for d in sections_dir.iterdir() if d.is_dir()]
    
    emit_progress(
        "start",
        total_sections=len(section_dirs),
        api_endpoint=api_endpoint
    )
    
    # Process each section
    sections_processed = 0
    for section_path in sorted(section_dirs):
        try:
            process_section(section_path, api_endpoint, max_workers=10)
            sections_processed += 1
        except Exception as e:
            emit_progress(
                "section_error",
                section=section_path.name,
                error=str(e)
            )
    
    emit_progress(
        "complete",
        sections_processed=sections_processed,
        total_sections=len(section_dirs)
    )


if __name__ == "__main__":
    main()

