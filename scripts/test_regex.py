#!/usr/bin/env python3
import re

# Test the regex pattern
pattern = re.compile(r'\[((?:\\[\[\]]|[^\]])*)\]\(([^)\s]+)\)')

# Test cases
test_cases = [
    '[\\[1\\]](https://example.com)',
    'poder existentes[\\[1\\]](https://katecrawford.net/atlas#:~:text=While%20technical%20systems%20present%20a,the%20expense%20of%20the%20many).',
    '[text](https://example.com)',
    '[^1](https://example.com)',
]

for test in test_cases:
    matches = pattern.findall(test)
    print(f"Test: {test[:60]}...")
    print(f"  Matches found: {len(matches)}")
    for i, (text, url) in enumerate(matches, 1):
        print(f"  Match {i}: text='{text}', url='{url[:50]}...'")
    print()
