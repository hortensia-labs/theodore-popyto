#!/usr/bin/env python3
"""
Convert HTML fragments to Markdown using html2text library.

This script takes an HTML fragment (without html/head/body tags) and converts
it to Markdown format using the html2text library. It handles citation pills
by extracting just the link text and URL in bare markdown format.

This is an alternative to the Pandoc-based approach for comparison.

Usage: python lib/utils/html-to-markdown-html2text.py <html_file_path>
Example: python lib/utils/html-to-markdown-html2text.py "sections/4-fundamentos-2/sources/4-1-la-danza-profesional.html"
"""

import sys
import re
from pathlib import Path

try:
    import html2text
except ImportError:
    print(
        "Error: html2text library is not installed.\n"
        "Please install it with: pip install html2text",
        file=sys.stderr
    )
    sys.exit(1)


def simplify_citation_pills(html_content):
    """
    Simplify citation pills in HTML by extracting just the link text and URL.
    
    Citation pills are complex nested structures like:
    <span data-testid="webpage-citation-pill"><a href="URL">...text...</a></span>
    
    This function replaces them with simple markdown links: [text](URL)
    """
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
    Convert an HTML fragment file to Markdown using html2text.
    
    Args:
        html_path: Path to the HTML file (can be fragment, no html/head/body tags)
        
    Returns:
        str: The markdown content
        
    Raises:
        FileNotFoundError: If the HTML file doesn't exist
    """
    html_file = Path(html_path)
    
    if not html_file.exists():
        raise FileNotFoundError(f"HTML file not found: {html_path}")
    
    # Read the HTML content
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Simplify citation pills before conversion
    html_content = simplify_citation_pills(html_content)
    
    # Configure html2text converter
    h = html2text.HTML2Text()
    h.ignore_links = False  # Keep links
    h.ignore_images = True  # Remove images
    h.ignore_emphasis = False  # Keep bold/italic
    h.body_width = 0  # Don't wrap lines
    h.unicode_snob = True  # Use unicode characters
    h.escape_snob = False  # Don't escape special markdown characters (fixes URL escaping)
    h.skip_internal_links = False
    h.inline_links = True  # Use inline link format [text](url)
    h.mark_code = True  # Mark code blocks
    
    # Convert HTML to Markdown
    markdown_content = h.handle(html_content)
    
    # Post-process to fix issues:
    # 1. Convert italic underscores to asterisks (but preserve URLs and code blocks)
    def replace_italic_underscores(text):
        """
        Replace italic underscores (_text_) with asterisks (*text*),
        but preserve underscores in URLs and code blocks.
        """
        # Protect URLs by temporarily replacing them
        url_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        url_placeholders = {}
        placeholder_idx = [0]
        
        def url_replacer(match):
            placeholder = f"__URL{placeholder_idx[0]}__"
            url_placeholders[placeholder] = match.group(0)
            placeholder_idx[0] += 1
            return placeholder
        
        text = re.sub(url_pattern, url_replacer, text)
        
        # Protect code blocks
        code_placeholders = {}
        code_idx = [0]
        
        def code_replacer(match):
            placeholder = f"__CODE{code_idx[0]}__"
            code_placeholders[placeholder] = match.group(0)
            code_idx[0] += 1
            return placeholder
        
        # Protect inline code and fenced code blocks
        text = re.sub(r'`[^`]+`', code_replacer, text)
        text = re.sub(r'```[\s\S]*?```', code_replacer, text)
        
        # Replace italic underscores: _text_ -> *text*
        # Match single underscores used for emphasis (not double underscores for bold)
        # Pattern matches: space or start, underscore, content, underscore, space or end
        # But avoids: __bold__, _word_word (underscore in middle of word)
        text = re.sub(r'(?<![*_])(?<!\w)_([^_\n*]+?)_(?![*_])(?!\w)', r'*\1*', text)
        
        # Restore protected content
        for placeholder, content in code_placeholders.items():
            text = text.replace(placeholder, content)
        for placeholder, content in url_placeholders.items():
            text = text.replace(placeholder, content)
        
        return text
    
    markdown_content = replace_italic_underscores(markdown_content)
    
    # Clean up any extra whitespace
    markdown_content = markdown_content.strip()
    
    # Remove multiple consecutive blank lines (more than 2)
    markdown_content = re.sub(r'\n{3,}', '\n\n', markdown_content)
    
    return markdown_content


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) != 2:
        print("Usage: python lib/utils/html-to-markdown-html2text.py <html_file_path>")
        print("Example: python lib/utils/html-to-markdown-html2text.py \"sections/4-fundamentos-2/sources/4-1-la-danza-profesional.html\"")
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

