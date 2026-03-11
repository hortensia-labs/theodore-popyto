#!/usr/bin/env python3
"""Print space-separated book IDs from build.config.json. Used by justfile."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import load_config

try:
    config = load_config()
    book_ids = list(config.books.keys())
    if not book_ids:
        sys.exit(1)
    print(" ".join(book_ids))
except Exception:
    sys.exit(1)
