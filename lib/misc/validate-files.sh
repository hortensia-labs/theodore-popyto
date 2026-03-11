#!/bin/bash
# validate-files.sh
# Validates that source files exist and are readable

set -euo pipefail

# Source shared output helpers (gum fallback included)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../gum-helpers.sh"

# Function to validate a directory
validate_directory() {
    local dir="$1"

    if [[ ! -d "$dir" ]]; then
        err "Directory does not exist: $dir"
        return 1
    fi

    if [[ ! -r "$dir" ]]; then
        err "Directory is not readable: $dir"
        return 1
    fi

    success "Directory is valid: $dir"
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
            err "File is not readable: $file"
            return 1
        fi

        # Check if file has content
        if [[ ! -s "$file" ]]; then
            warn "File is empty: $file"
        fi

        success "File is valid: $(basename "$file")"

    done < <(find "$dir" -maxdepth 1 -name "$pattern" -type f -print0 2>/dev/null | sort -z)

    if [[ $files_found -eq 0 ]]; then
        warn "No markdown files found in $dir matching pattern: $pattern"
        return 1
    fi

    success "Found $files_found markdown file(s)"
    return 0
}

# Main validation function
main() {
    local source_dir="$1"

    info "Validating source directory: $source_dir"
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
    success "All validations passed!"
}

# Check if source directory is provided
if [[ $# -eq 0 ]]; then
    err "Usage: $0 <source_directory>"
    exit 1
fi

# Run main function
main "$1"
