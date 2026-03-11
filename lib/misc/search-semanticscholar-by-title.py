#!/usr/bin/env python3
"""
Search for articles in Semantic Scholar by title.

Usage: python lib/utils/search-semanticscholar-by-title.py <title> [limit]
Example: python lib/utils/search-semanticscholar-by-title.py "Attention Is All You Need"
Example: python lib/utils/search-semanticscholar-by-title.py "Deep Learning" 10
"""

import sys
import os
import json

try:
    from semanticscholar import SemanticScholar
except ImportError:
    print("Error: 'semanticscholar' library is required. Install it with: pip install semanticscholar")
    sys.exit(1)


def search_articles_by_title(title, limit=10):
    """
    Search for articles in Semantic Scholar by title.
    
    Args:
        title: Title or title fragment to search for
        limit: Maximum number of results to return (default: 10)
    
    Returns:
        list: List of article data from Semantic Scholar, or empty list if not found
    """
    # Get API key from environment variable if available
    api_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY')
    
    # Initialize Semantic Scholar client
    if api_key:
        sch = SemanticScholar(api_key=api_key)
    else:
        sch = SemanticScholar()
    
    try:
        # Search for papers by title
        results = sch.search_paper(title, limit=limit)
        
        if results and len(results) > 0:
            return list(results)
        else:
            return []
    except Exception as e:
        print(f"Error searching for articles: {str(e)}")
        return None


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python lib/utils/search-semanticscholar-by-title.py <title> [limit]")
        print("Example: python lib/utils/search-semanticscholar-by-title.py \"Attention Is All You Need\"")
        print("Example: python lib/utils/search-semanticscholar-by-title.py \"Deep Learning\" 10")
        sys.exit(1)
    
    title = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) == 3 else 10
    
    # Validate limit
    if limit < 1 or limit > 100:
        print("Error: Limit must be between 1 and 100")
        sys.exit(1)
    
    # Search for articles
    articles = search_articles_by_title(title, limit)
    
    if articles is None:
        print(f"Error occurred while searching for: {title}")
        sys.exit(1)
    elif len(articles) == 0:
        print(f"No articles found for title: {title}")
        sys.exit(1)
    else:
        # Print results as JSON
        print(f"Found {len(articles)} article(s) for title: {title}\n")
        print(json.dumps(articles, indent=2, default=str))


if __name__ == "__main__":
    main()

