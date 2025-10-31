#!/bin/bash
# validate-files.sh
# Validates that source files exist and are readable

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}ERROR:${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to validate a directory
validate_directory() {
    local dir="$1"
    
    if [[ ! -d "$dir" ]]; then
        print_error "Directory does not exist: $dir"
        return 1
    fi
    
    if [[ ! -r "$dir" ]]; then
        print_error "Directory is not readable: $dir"
        return 1
    fi
    
    print_success "Directory is valid: $dir"
    return 0
}

# Function to validate markdown files
validate_markdown_files() {
    local dir="$1"
    local pattern="${2:-*.md}"
    local files_found=0
    
    # Find all markdown files matching the pattern
    while IFS= read -r -d '' file; do
        files_found=$((files_found + 1))
        
        if [[ ! -r "$file" ]]; then
            print_error "File is not readable: $file"
            return 1
        fi
        
        # Check if file has content
        if [[ ! -s "$file" ]]; then
            print_warning "File is empty: $file"
        fi
        
        print_success "File is valid: $(basename "$file")"
        
    done < <(find "$dir" -maxdepth 1 -name "$pattern" -type f -print0 2>/dev/null | sort -z)
    
    if [[ $files_found -eq 0 ]]; then
        print_warning "No markdown files found in $dir matching pattern: $pattern"
        return 1
    fi
    
    print_success "Found $files_found markdown file(s)"
    return 0
}

# Main validation function
main() {
    local source_dir="$1"
    
    echo "Validating source directory: $source_dir"
    echo "----------------------------------------"
    
    # Validate directory
    if ! validate_directory "$source_dir"; then
        exit 1
    fi
    
    # Validate markdown files (any .md files)
    if ! validate_markdown_files "$source_dir" "*.md"; then
        exit 1
    fi
    
    echo "----------------------------------------"
    print_success "All validations passed!"
}

# Check if source directory is provided
if [[ $# -eq 0 ]]; then
    print_error "Usage: $0 <source_directory>"
    exit 1
fi

# Run main function
main "$1"
