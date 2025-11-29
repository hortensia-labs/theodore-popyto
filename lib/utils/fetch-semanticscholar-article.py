#!/usr/bin/env python3
"""
Fetch an article from Semantic Scholar using corpusId, paper ID, or query string.

Usage: python lib/utils/fetch-semanticscholar-article.py <corpusId_or_paper_id_or_query>
Example: python lib/utils/fetch-semanticscholar-article.py "142023751"  # corpusId
Example: python lib/utils/fetch-semanticscholar-article.py "10.1038/nature12373"  # DOI
Example: python lib/utils/fetch-semanticscholar-article.py "Attention Is All You Need"  # Query
"""

import sys
import os
import json

try:
    from semanticscholar import SemanticScholar
except ImportError:
    print("Error: 'semanticscholar' library is required. Install it with: pip install semanticscholar")
    sys.exit(1)


def is_likely_corpus_id(identifier):
    """
    Check if the identifier is likely a corpusId (numeric string).
    
    Args:
        identifier: String identifier to check
    
    Returns:
        bool: True if identifier appears to be a corpusId
    """
    # corpusId is typically a numeric string (can be very long)
    return identifier.isdigit()


def fetch_article(identifier):
    """
    Fetch an article from Semantic Scholar using corpusId, paper ID, or query string.
    
    Args:
        identifier: corpusId (numeric), Paper ID (DOI, S2PaperId, ArXiv ID), or query string
    
    Returns:
        dict: Article data from Semantic Scholar, or None if not found
    """
    # Get API key from environment variable if available
    api_key = os.getenv('SEMANTIC_SCHOLAR_API_KEY')
    
    # Initialize Semantic Scholar client
    if api_key:
        sch = SemanticScholar(api_key=api_key)
    else:
        sch = SemanticScholar()
    
    # Check if it's likely a corpusId (numeric)
    is_corpus_id = is_likely_corpus_id(identifier)
    
    try:
        # Try to get paper by ID first
        # get_paper() accepts: corpusId (S2PaperId), DOI, ArXiv ID, MAG ID, ACL ID, PubMed ID
        paper = sch.get_paper(identifier)
        return paper
    except Exception as e:
        # If get_paper fails and it's not a corpusId, try searching
        # If it is a corpusId, the error is likely real (paper not found)
        if is_corpus_id:
            print(f"Error: Could not find article with corpusId '{identifier}'")
            print(f"Details: {str(e)}")
            return None
        
        # For non-numeric identifiers, try searching as a query
        try:
            print(f"Note: '{identifier}' not found as paper ID, trying search...")
            results = sch.search_paper(identifier, limit=1)
            if results and len(results) > 0:
                return results[0]
            else:
                print(f"Error: No results found for query '{identifier}'")
                return None
        except Exception as search_error:
            print(f"Error fetching article: {str(e)}")
            print(f"Search also failed: {str(search_error)}")
            return None


def main():
    if len(sys.argv) != 2:
        print("Usage: python lib/utils/fetch-semanticscholar-article.py <corpusId_or_paper_id_or_query>")
        print("Example: python lib/utils/fetch-semanticscholar-article.py \"142023751\"  # corpusId")
        print("Example: python lib/utils/fetch-semanticscholar-article.py \"10.1038/nature12373\"  # DOI")
        print("Example: python lib/utils/fetch-semanticscholar-article.py \"Attention Is All You Need\"  # Query")
        sys.exit(1)
    
    identifier = sys.argv[1]
    
    # Fetch the article
    article = fetch_article(identifier)
    
    if article:
        # Print article data as JSON
        print(json.dumps(article, indent=2, default=str))
    else:
        print(f"Could not fetch article for: {identifier}")
        sys.exit(1)


if __name__ == "__main__":
    main()

