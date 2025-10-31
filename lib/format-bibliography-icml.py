#!/usr/bin/env python3
"""
Script to format bibliography ICML files by replacing paragraph styles.

This script performs the following replacements:
* "Paragraph" -> "Paragraph Bibliography"
* "ParagraphStyle/Paragraph" -> "ParagraphStyle/Paragraph Bibliography"

Usage:
    python format-bibliography-icml.py [file_path]

If no file_path is provided, it will use the BIBLIOGRAPHY_SECTION environment variable
to process generated/icml/{BIBLIOGRAPHY_SECTION}.icml

Environment Variables:
    BIBLIOGRAPHY_SECTION: Name of the bibliography section file (without .icml extension)
"""

import sys
import os
import argparse
from pathlib import Path


def format_bibliography_icml(file_path):
    """
    Format the bibliography ICML file by replacing paragraph styles.
    
    Args:
        file_path (str): Path to the ICML file to process
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' does not exist.")
            return False
        
        # Read the file content
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Perform replacements
        original_content = content
        
        # Replace "ParagraphStyle/Paragraph" first to avoid conflicts
        content = content.replace("ParagraphStyle/Paragraph", "ParagraphStyle/Paragraph Bibliography")
        
        # Then replace standalone "Paragraph"
        content = content.replace('"Paragraph"', '"Paragraph Bibliography"')
        
        # Check if any changes were made
        if content == original_content:
            print(f"No changes needed in '{file_path}'.")
            return True
        
        # Write the modified content back to the file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print(f"Successfully processed '{file_path}'.")
        return True
        
    except Exception as e:
        print(f"Error processing file '{file_path}': {str(e)}")
        return False


def get_project_root():
    """Get the project root directory."""
    # Start from the script's directory and go up until we find the project root
    current_dir = Path(__file__).resolve().parent
    while current_dir.parent != current_dir:
        if (current_dir / '.git').exists() or (current_dir / 'README.md').exists():
            return current_dir
        current_dir = current_dir.parent
    
    # If we can't find the project root, assume we're in the scripts folder
    return Path(__file__).resolve().parent.parent


def load_env_file(env_file_path):
    """Simple .env file loader that doesn't require external dependencies."""
    env_vars = {}
    if os.path.exists(env_file_path):
        try:
            with open(env_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    # Parse KEY=VALUE format
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
        except Exception as e:
            print(f"Warning: Could not read .env file: {e}")
    return env_vars


def get_default_file_path():
    """Get the default file path from environment variables."""
    # Load environment variables from project root
    project_root = get_project_root()
    env_file = project_root / '.env'
    
    # Load .env file if it exists
    env_vars = load_env_file(str(env_file))
    
    # Get the bibliography section from environment (check .env first, then system env)
    bibliography_section = env_vars.get('BIBLIOGRAPHY_SECTION') or os.getenv('BIBLIOGRAPHY_SECTION')
    
    if not bibliography_section:
        raise ValueError(
            "BIBLIOGRAPHY_SECTION environment variable is not set or empty. "
            f"Please set it in your .env file ({env_file}) or as a system environment variable, "
            "or provide a file path as argument."
        )
    
    # Construct the file path relative to project root
    file_path = project_root / 'generated' / 'icml' / f'{bibliography_section}.icml'
    
    return str(file_path)


def main():
    """Main function to handle command line arguments and execute the formatting."""
    parser = argparse.ArgumentParser(
        description="Format bibliography ICML files by replacing paragraph styles.",
        epilog="Example: python format-bibliography-icml.py [path/to/file.icml]"
    )
    parser.add_argument(
        "file_path",
        nargs='?',  # Make file_path optional
        help="Path to the ICML file to process (optional, defaults to BIBLIOGRAPHY_SECTION env var)"
    )
    
    args = parser.parse_args()
    
    try:
        if args.file_path:
            # Use provided file path
            file_path = args.file_path
            
            # If it's a relative path, make it relative to project root
            if not os.path.isabs(file_path):
                project_root = get_project_root()
                file_path = str(project_root / file_path)
        else:
            # Use default file path from environment
            file_path = get_default_file_path()
        
        # Process the file
        success = format_bibliography_icml(file_path)
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except ValueError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
