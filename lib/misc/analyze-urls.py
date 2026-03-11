#!/usr/bin/env python3
"""
Analyze URLs by making POST requests to a citation linker service and generate a report.

Usage: python lib/utils/analyze-urls.py <json_file_path>
Example: python lib/utils/analyze-urls.py "sections/3-fundamentos-1/references/urls.json"
Output: sections/3-fundamentos-1/references/urls-report.json
"""

import sys
import os
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

try:
    import requests
except ImportError:
    print("Error: 'requests' library is required. Install it with: pip install requests")
    sys.exit(1)


# Thread-safe counter for progress tracking
class ProgressCounter:
    def __init__(self, total):
        self.total = total
        self.completed = 0
        self.failed = 0
        self.lock = Lock()
    
    def increment_completed(self):
        with self.lock:
            self.completed += 1
            self._print_progress()
    
    def increment_failed(self):
        with self.lock:
            self.failed += 1
            self._print_progress()
    
    def _print_progress(self):
        total_processed = self.completed + self.failed
        percentage = (total_processed / self.total * 100) if self.total > 0 else 0
        print(f"\rProgress: {total_processed}/{self.total} ({percentage:.1f}%) | "
              f"Completed: {self.completed} | Failed: {self.failed}", end='', flush=True)


def analyze_url(url, api_endpoint, progress_counter):
    """
    Make a POST request to analyze a URL.
    
    Returns:
        dict: Contains 'url' and response data, or 'url' and 'error' if request failed
    """
    try:
        response = requests.post(
            api_endpoint,
            json={"url": url},
            timeout=30,  # 30 second timeout per request
            headers={"Content-Type": "application/json"}
        )
        
        # Check if request was successful
        if response.status_code == 200:
            try:
                response_data = response.json()
                result = {"url": url}
                result.update(response_data)
                progress_counter.increment_completed()
                return result
            except json.JSONDecodeError:
                result = {
                    "url": url,
                    "error": f"Invalid JSON response: {response.text[:200]}",
                    "status_code": response.status_code
                }
                progress_counter.increment_failed()
                return result
        else:
            result = {
                "url": url,
                "error": f"HTTP {response.status_code}: {response.text[:200]}",
                "status_code": response.status_code
            }
            progress_counter.increment_failed()
            return result
            
    except requests.exceptions.Timeout:
        result = {
            "url": url,
            "error": "Request timeout"
        }
        progress_counter.increment_failed()
        return result
    except requests.exceptions.ConnectionError:
        result = {
            "url": url,
            "error": "Connection error - is the service running at localhost:23119?"
        }
        progress_counter.increment_failed()
        return result
    except Exception as e:
        result = {
            "url": url,
            "error": f"Unexpected error: {str(e)}"
        }
        progress_counter.increment_failed()
        return result


def analyze_urls_from_file(input_file_path, api_endpoint, max_workers=10):
    """
    Analyze all URLs from a JSON file using parallel requests.
    
    Args:
        input_file_path: Path to JSON file containing array of URLs
        api_endpoint: API endpoint URL
        max_workers: Maximum number of parallel workers
    
    Returns:
        list: Array of results, each containing URL and response data
    """
    input_file = Path(input_file_path)
    
    # Check if input file exists
    if not input_file.exists():
        print(f"Error: File '{input_file_path}' not found.")
        print(f"Current working directory: {os.getcwd()}")
        print(f"Absolute path attempted: {input_file.absolute()}")
        sys.exit(1)
    
    # Read URLs from JSON file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            urls = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in file '{input_file_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file '{input_file_path}': {e}")
        sys.exit(1)
    
    # Validate that it's a list
    if not isinstance(urls, list):
        print(f"Error: JSON file must contain an array of URLs.")
        sys.exit(1)
    
    if len(urls) == 0:
        print("Warning: No URLs found in the file.")
        return []
    
    print(f"Found {len(urls)} URL(s) to analyze.")
    print(f"Using {max_workers} parallel workers.")
    print(f"API endpoint: {api_endpoint}\n")
    
    # Initialize progress counter
    progress_counter = ProgressCounter(len(urls))
    
    # Process URLs in parallel
    results = []
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_url = {
            executor.submit(analyze_url, url, api_endpoint, progress_counter): url
            for url in urls
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_url):
            result = future.result()
            results.append(result)
    
    elapsed_time = time.time() - start_time
    
    # Print final progress and summary
    print(f"\n\nAnalysis complete!")
    print(f"Total URLs processed: {len(results)}")
    print(f"Successful: {progress_counter.completed}")
    print(f"Failed: {progress_counter.failed}")
    print(f"Time elapsed: {elapsed_time:.2f} seconds")
    print(f"Average time per URL: {elapsed_time/len(urls):.2f} seconds")
    
    return results


def generate_report(input_file_path, results):
    """Generate the report file with results."""
    input_file = Path(input_file_path)
    
    # Generate output filename
    stem = input_file.stem
    suffix = input_file.suffix
    output_file = input_file.parent / f"{stem}-report{suffix}"
    
    # Write results to output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nReport saved to: {output_file.absolute()}")
    except Exception as e:
        print(f"Error writing to file '{output_file}': {e}")
        sys.exit(1)


def main():
    if len(sys.argv) != 2:
        print("Usage: python lib/utils/analyze-urls.py <json_file_path>")
        print("Example: python lib/utils/analyze-urls.py \"sections/3-fundamentos-1/references/urls.json\"")
        sys.exit(1)
    
    input_file_path = sys.argv[1]
    api_endpoint = "http://localhost:23119/citationlinker/analyzeurl"
    
    # Check if API endpoint is reachable (optional check)
    try:
        response = requests.get("http://localhost:23119", timeout=2)
    except:
        print("Warning: Could not reach localhost:23119. Make sure the service is running.")
        print("Continuing anyway...\n")
    
    # Analyze URLs
    results = analyze_urls_from_file(input_file_path, api_endpoint, max_workers=10)
    
    # Generate report
    generate_report(input_file_path, results)


if __name__ == "__main__":
    main()

