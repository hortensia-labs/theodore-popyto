# Validation and Testing Utilities
# Comprehensive validation, testing, and quality assurance commands

# Configuration loaded from environment variables (.env file)

#: Validate cross-references against anchor registry
validate-crossreferences:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔗 Cross-Reference Validation"

    registry_file="$GENERATED_ROOT/data/crossref-registry.json"
    if [ ! -f "$registry_file" ]; then
        gum style --foreground 196 --bold "❌ Error: Cross-reference registry not found"
        gum style --foreground 226 "💡 Run 'just scan-ref' first to build the registry"
        exit 1
    fi

    gum spin --spinner dot --title "Validating cross-references against anchor registry..." -- \
        python3 "$SCRIPTS_ROOT/validate-crossreferences.py" "$MARKDOWN_OUTPUT" "$registry_file"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "✅ Cross-reference validation complete!"
    else
        gum style --foreground 196 --bold "❌ Cross-reference validation failed"
        exit 1
    fi

#: Run citation validation tests
test-citations:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🧪 Citation Validation Tests"

    cd "$SECTIONS_ROOT/.."

    gum spin --spinner dot --title "Running citation validation tests..." -- \
        python3 tests/test_citation_validation.py

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "✅ Tests complete! Check tests/test_report.txt for details"
    else
        gum style --foreground 196 --bold "❌ Tests failed"
        exit 1
    fi

#: Clean validation cache and reports
clean-validation:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🧹 Validation Cache Cleanup"

    if gum confirm "Clean all validation cache and reports?"; then
        gum spin --spinner dot --title "Cleaning validation files..." -- bash -c '
            rm -rf references/data/cache/* 2>/dev/null || true
            rm -rf references/logs/* 2>/dev/null || true
            rm -rf references/reports/drafts/* 2>/dev/null || true
        '
        gum style --foreground 46 --bold "✅ Validation cache cleaned"
    else
        gum style --foreground 226 "Cleanup cancelled"
    fi

#: Watch mode - run validation every 60 seconds
validate-citations-watch:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "👁️ Citation Validation Watch Mode"

    gum style --foreground 226 "Press Ctrl+C to stop watch mode"

    trap 'gum style --foreground 46 "Watch mode stopped"; exit 0' INT

    while true; do
        clear
        gum style --foreground 51 "⏰ Running validation at $(date)"
        just validate-citations-quick

        gum style --foreground 51 "⏰ Next run in 60 seconds... (Ctrl+C to stop)"
        sleep 60
    done

#: Comprehensive validation workflow with interactive selection
validation-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 Validation Workflow Selection"

    workflows=(
        "validate-crossreferences:Validate cross-references against registry"
        "test-citations:Run citation validation test suite"
        "validate-citations-watch:Watch mode for continuous validation"
        "clean-validation:Clean validation cache and reports"
        "full-validation:Complete validation workflow"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select validation workflow: " \
            --header="Choose the validation workflow to execute" \
            --border \
            --height=40% \
            --layout=reverse \
            --info=inline \
            --preview='echo {}' \
            --preview-window=up:3:wrap | \
        cut -d: -f1)

    if [ -z "$selected" ]; then
        gum style --foreground 226 "Operation cancelled"
        exit 0
    fi

    case "$selected" in
        "full-validation")
            gum confirm "Execute complete validation workflow?" && {
                gum style --foreground 51 "Step 1/4: Cross-reference validation"
                just validate-crossreferences

                gum style --foreground 51 "Step 2/4: Citation validation"
                just validate-citations-quick

                gum style --foreground 51 "Step 3/4: Running tests"
                just test-citations

                gum style --foreground 51 "Step 4/4: Generating reports"
                just generate-validation-report

                gum style --foreground 46 --bold "🎉 Complete validation workflow finished!"
            }
            ;;
        *)
            just "$selected"
            ;;
    esac

#: File integrity validation for all markdown content
validate-file-integrity:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔍 File Integrity Validation"

    total_files=0
    valid_files=0
    invalid_files=()

    gum style --foreground 51 "Scanning all markdown files..."

    for section_dir in $SECTIONS_ROOT/*/; do
        if [ -d "$section_dir/content" ]; then
            section_name=$(basename "$section_dir")

            while IFS= read -r -d '' file; do
                ((total_files++))

                if [ -r "$file" ] && [ -s "$file" ]; then
                    # Check for basic markdown validity
                    if head -1 "$file" | grep -qE '^#|^[[:space:]]*$' || [ ! -s "$file" ]; then
                        ((valid_files++))
                    else
                        invalid_files+=("$file")
                    fi
                else
                    invalid_files+=("$file")
                fi
            done < <(find "$section_dir/content" -name "*.md" -type f -print0 2>/dev/null)
        fi
    done

    gum format -- \
        "File Integrity Report:" \
        "Total files: $total_files" \
        "Valid files: $valid_files" \
        "Invalid files: ${#invalid_files[@]}"

    if [ ${#invalid_files[@]} -gt 0 ]; then
        gum style --foreground 196 "⚠️ Invalid files found:"
        printf '%s\n' "${invalid_files[@]}" | while read -r file; do
            echo "  - $file"
        done
        exit 1
    else
        gum style --foreground 46 --bold "✅ All files are valid!"
    fi

#: Validate bibliography section configuration
validate-bibliography-config:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📚 Bibliography Configuration Check"

    config_valid=true

    # Check .env file
    if [ ! -f .env ]; then
        gum style --foreground 196 "❌ .env file not found"
        config_valid=false
    else
        source .env

        if [ -z "${BIBLIOGRAPHY_SECTION:-}" ]; then
            gum style --foreground 196 "❌ BIBLIOGRAPHY_SECTION not set in .env"
            config_valid=false
        else
            # Check if bibliography section exists
            if [ ! -d "$SECTIONS_ROOT/$BIBLIOGRAPHY_SECTION" ]; then
                gum style --foreground 196 "❌ Bibliography section directory not found: $BIBLIOGRAPHY_SECTION"
                config_valid=false
            fi
        fi

        if [ -z "${TOC_DOCUMENT:-}" ]; then
            gum style --foreground 226 "⚠️ TOC_DOCUMENT not set in .env (optional)"
        fi

        if [ -z "${TOC_STYLE:-}" ]; then
            gum style --foreground 226 "⚠️ TOC_STYLE not set in .env (optional)"
        fi
    fi

    if $config_valid; then
        gum style --foreground 46 --bold "✅ Bibliography configuration is valid!"
    else
        gum style --foreground 196 --bold "❌ Bibliography configuration has issues"
        exit 1
    fi