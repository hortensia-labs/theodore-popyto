#!/usr/bin/env python3
"""
Convert HTML fragments to Markdown using Pandoc.

This script takes an HTML fragment (without html/head/body tags) and converts
it to Markdown format. It handles citation pills by extracting just the link
text and URL in bare markdown format.

Usage: python lib/utils/html-to-markdown.py <html_file_path>
Example: python lib/utils/html-to-markdown.py "sections/4-fundamentos-2/sources/4-1-la-danza-profesional.html"
"""

import sys
import subprocess
import re
from pathlib import Path


def simplify_citation_pills(html_content):
    """
    Simplify citation pills in HTML by extracting just the link text and URL.
    
    Citation pills are complex nested structures like:
    <span data-testid="webpage-citation-pill"><a href="URL">...text...</a></span>
    
    This function replaces them with simple markdown links: [text](URL)
    """
    # Pattern to match citation pills: <span...data-testid="webpage-citation-pill">...<a href="URL">...text...</a>...</span>
    # We'll match the entire pill structure and extract the link and text
    def replace_pill(match):
        pill_content = match.group(1)
        
        # Extract the href URL from the <a> tag
        href_match = re.search(r'<a[^>]+href=["\']([^"\']+)["\']', pill_content)
        if not href_match:
            return ''  # If no href found, remove the pill
        
        url = href_match.group(1)
        
        # Extract text content from the <a> tag
        # First, try to find text in spans with specific classes (like "truncate" or "max-w")
        # These usually contain the display text
        text_match = re.search(
            r'<span[^>]*(?:class=["\'][^"\']*(?:truncate|max-w|line-clamp)[^"\']*["\']|class=["\'][^"\']*font-semibold[^"\']*["\'])[^>]*>([^<]+)</span>',
            pill_content,
            re.IGNORECASE
        )
        
        if text_match:
            link_text = text_match.group(1).strip()
        else:
            # Fallback: extract all text from the <a> tag, removing HTML tags
            text_content = re.sub(r'<[^>]+>', '', pill_content)
            text_content = text_content.strip()
            
            if text_content:
                link_text = text_content
            else:
                # Final fallback: extract domain from URL
                domain_match = re.search(r'https?://(?:www\.)?([^/]+)', url)
                link_text = domain_match.group(1) if domain_match else url[:50]
        
        return f'[{link_text}]({url})'
    
    # Match citation pills: <span...data-testid="webpage-citation-pill">...</span>
    # Use non-greedy matching to handle nested structures
    pattern = r'<span[^>]*data-testid=["\']webpage-citation-pill["\'][^>]*>(.*?)</span>'
    html_content = re.sub(pattern, replace_pill, html_content, flags=re.DOTALL | re.IGNORECASE)
    
    return html_content


def html_to_markdown(html_path):
    """
    Convert an HTML fragment file to Markdown using Pandoc.
    
    Args:
        html_path: Path to the HTML file (can be fragment, no html/head/body tags)
        
    Returns:
        str: The markdown content
        
    Raises:
        FileNotFoundError: If the HTML file doesn't exist
        subprocess.CalledProcessError: If pandoc fails
    """
    html_file = Path(html_path)
    
    if not html_file.exists():
        raise FileNotFoundError(f"HTML file not found: {html_path}")
    
    # Read the HTML content
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Simplify citation pills before conversion
    # This extracts just the link text and URL from complex nested structures
    html_content = simplify_citation_pills(html_content)
    
    # Wrap the fragment in minimal HTML structure for pandoc
    wrapped_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body>
{html_content}
</body>
</html>"""
    
    # Call pandoc to convert HTML to Markdown
    try:
        result = subprocess.run(
            ['pandoc', '--from=html', '--to=markdown', '--wrap=none', '--standalone'],
            input=wrapped_html,
            text=True,
            capture_output=True,
            check=True
        )
        
        markdown_content = result.stdout
        
        # Remove the body wrapper that pandoc might add
        # Pandoc might add some metadata or body tags, clean them up
        markdown_content = re.sub(r'^---\s*$.*?^---\s*$', '', markdown_content, flags=re.MULTILINE | re.DOTALL)
        markdown_content = markdown_content.strip()
        
        return markdown_content
        
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Pandoc conversion failed: {e.stderr}") from e
    except FileNotFoundError:
        raise RuntimeError(
            "Pandoc is not installed or not in PATH. "
            "Please install pandoc: https://pandoc.org/installing.html"
        ) from None


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) != 2:
        print("Usage: python lib/utils/html-to-markdown.py <html_file_path>")
        print("Example: python lib/utils/html-to-markdown.py \"sections/4-fundamentos-2/sources/4-1-la-danza-profesional.html\"")
        sys.exit(1)
    
    html_path = sys.argv[1]
    html_file = Path(html_path)
    
    try:
        # Convert HTML to Markdown
        markdown = html_to_markdown(html_path)
        
        # Create output path: same location, same filename but with .md extension
        if html_file.suffix.lower() == '.html':
            md_path = html_file.with_suffix('.md')
        else:
            # If no .html extension, just add .md
            md_path = html_file.with_suffix(html_file.suffix + '.md')
        
        # Write markdown to file
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(markdown)
        
        print(f"Successfully converted {html_path}")
        print(f"Markdown saved to: {md_path.absolute()}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

