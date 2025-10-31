# Compilation and Processing Workflows
# All configuration loaded from environment variables (.env file)

#: Main compile command - compiles a specific section
compile-section section:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    section="{{section}}"

    gum style \
        --foreground $COLOR_PURPLE --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔨 Compiling Section: ${section}"

    # Progress tracking
    total_steps=3
    current_step=0

    # Step 1: Validation
    ((current_step++))
    gum style --foreground $COLOR_CYAN "[$current_step/$total_steps] Validating section structure..."
    just _validate-section-internal "${section}"

    # Step 2: Merging
    ((current_step++))
    gum style --foreground $COLOR_CYAN "[$current_step/$total_steps] Merging markdown files..."
    just _merge-section-internal "${section}"

    # Step 3: ICML conversion
    ((current_step++))
    gum style --foreground $COLOR_CYAN "[$current_step/$total_steps] Converting to ICML..."
    just _compile-icml-internal "${section}"

    gum style --foreground $COLOR_GREEN --bold "✅ Section '${section}' compiled successfully!"

#: Interactive section compilation using fzf
compile-interactive:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 Interactive Section Compilation"

    # Get available sections
    sections=($(find $SECTIONS_ROOT -maxdepth 1 -type d -exec basename {} \; | grep -v "^sections$" | sort))

    if [ ${#sections[@]} -eq 0 ]; then
        gum style --foreground 196 --bold "❌ No sections found in $SECTIONS_ROOT"
        exit 1
    fi

    # Filter valid sections
    valid_sections=()
    for section in "${sections[@]}"; do
        if [ -d "$SECTIONS_ROOT/$section/content" ] && [ -n "$(find $SECTIONS_ROOT/$section/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then
            file_count=$(find "$SECTIONS_ROOT/$section/content" -name "$ALL_MD_PATTERN" -type f 2>/dev/null | wc -l | tr -d ' ')
            valid_sections+=("$section:$file_count files")
        fi
    done

    if [ ${#valid_sections[@]} -eq 0 ]; then
        gum style --foreground 196 --bold "❌ No valid sections found"
        exit 1
    fi

    selected=$(printf '%s\n' "${valid_sections[@]}" | \
        fzf --prompt="Select section to compile: " \
            --header="Choose a section to compile (showing file counts)" \
            --border \
            --height=60% \
            --layout=reverse \
            --info=inline \
            --preview='echo "Section: {}" | cut -d: -f1' \
            --preview-window=up:3:wrap | \
        cut -d: -f1)

    if [ -z "$selected" ]; then
        gum style --foreground 226 "Compilation cancelled"
        exit 0
    fi

    just compile-section "$selected"

#: Validate section structure and files
validate-section section:
    @just _validate-section-internal ${section}

#: Internal validation function
_validate-section-internal section:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    section="{{section}}"
    echo "🔍 Validating section: ${section}"
    if [ ! -d "$SECTIONS_ROOT/${section}" ]; then
        echo "\033[1;31m❌ Error: Section folder '${section}' not found in $SECTIONS_ROOT\033[0m"
        exit 1
    fi
    if [ ! -d "$SECTIONS_ROOT/${section}/content" ]; then
        echo "\033[1;31m❌ Error: 'content' folder not found in ${section}\033[0m"
        exit 1
    fi
    if [ ! -n "$(find $SECTIONS_ROOT/${section}/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then
        echo "\033[1;31m❌ Error: No markdown files found in ${section}/content/\033[0m"
        echo "   Expected pattern: $ALL_MD_PATTERN"
        exit 1
    fi
    # Ensure generated directories exist
    mkdir -p $MARKDOWN_OUTPUT $ICML_OUTPUT
    echo "   📁 Section structure: ✅"
    echo "   📝 Markdown files found: $(find $SECTIONS_ROOT/${section}/content -name "$ALL_MD_PATTERN" -type f | wc -l | tr -d ' ')"
    $SCRIPTS_ROOT/utils/validate-files.sh $SECTIONS_ROOT/${section}/content
    echo "✅ Section validation complete"

#: Merge markdown files in content/ into generated/markdown/[section-name].md
merge-section section:
    @just _merge-section-internal ${section}

#: Internal merge function
_merge-section-internal section:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    section="{{section}}"
    echo "📝 Merging section: ${section}"
    mkdir -p $MARKDOWN_OUTPUT
    # Create empty file with section name
    > $MARKDOWN_OUTPUT/${section}.md
    # Process files in sorted order (numbered files first, then others)
    first_file=true
    numbered_files=$(find $SECTIONS_ROOT/${section}/content -name "$NUMBERED_PATTERN" -type f | sort)
    other_files=$(find $SECTIONS_ROOT/${section}/content -name "$ALL_MD_PATTERN" -not -name "$NUMBERED_PATTERN" -type f | sort)
    for file in $numbered_files $other_files; do
        echo "   📄 Adding: $(basename "$file")"
        if [ "$first_file" = "true" ]; then
            cat "$file" >> $MARKDOWN_OUTPUT/${section}.md
            first_file=false
        else
            echo "" >> $MARKDOWN_OUTPUT/${section}.md
            cat "$file" >> $MARKDOWN_OUTPUT/${section}.md
        fi
    done
    # Remove any trailing blank lines and ensure single final newline
    perl -pe 'chomp if eof' $MARKDOWN_OUTPUT/${section}.md > $MARKDOWN_OUTPUT/${section}.tmp
    mv $MARKDOWN_OUTPUT/${section}.tmp $MARKDOWN_OUTPUT/${section}.md
    echo "" >> $MARKDOWN_OUTPUT/${section}.md
    echo "✅ Merged into: $MARKDOWN_OUTPUT/${section}.md"

# Convert merged markdown to ICML
compile-icml section="":
    @if [ "${section}" = "" ]; then \
        echo "🔄 Converting all sections to ICML..."; \
        just _compile-icml-all; \
    else \
        just _compile-icml-internal ${section}; \
    fi

# Internal ICML conversion (called with section parameter)
_compile-icml-internal section:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    section="{{section}}"
    echo "🔄 Converting to ICML: ${section}"
    if [ ! -f "$MARKDOWN_OUTPUT/${section}.md" ]; then
        echo "\033[1;31m❌ Error: Markdown file not found: $MARKDOWN_OUTPUT/${section}.md\033[0m"
        echo "\033[1;33m💡 Tip: Run 'just merge-section ${section}' first\033[0m"
        exit 1
    fi
    mkdir -p $ICML_OUTPUT
    pandoc $PANDOC_FLAGS \
        $MARKDOWN_OUTPUT/${section}.md \
        -o $ICML_OUTPUT/${section}.icml
    echo "🔧 Post-processing ICML for cross-reference compatibility..."
    perl -i -pe 's/(<HyperlinkTextDestination Self="HyperlinkTextDestination\/(#[^"]*)" Name=")Destination(")/$$1$$2$$3/g' $ICML_OUTPUT/${section}.icml
    echo "✅ ICML created: $ICML_OUTPUT/${section}.icml"

# Internal function to compile all sections to ICML
_compile-icml-all:
    @count=0; \
    processed=0; \
    mkdir -p $ICML_OUTPUT; \
    for dir in $SECTIONS_ROOT/*/; do \
        if [ -d "$$dir" ]; then \
            section_name=$$(basename "$$dir"); \
            md_file="$MARKDOWN_OUTPUT/$$section_name.md"; \
            if [ -f "$$md_file" ]; then \
                echo "   🔄 Converting: $$section_name"; \
                pandoc $PANDOC_FLAGS "$$md_file" -o "$ICML_OUTPUT/$$section_name.icml"; \
                echo "   🔧 Post-processing: $$section_name.icml"; \
                perl -i -pe 's/(<HyperlinkTextDestination Self="HyperlinkTextDestination\/(#[^"]*)" Name=")Destination(")/$$1$$2$$3/g' "$ICML_OUTPUT/$$section_name.icml"; \
                echo "   ✅ Created: $$section_name.icml"; \
                processed=$$((processed + 1)); \
            else \
                echo "   ⚠️  Skipping $$section_name (no markdown file)"; \
            fi; \
            count=$$((count + 1)); \
        fi; \
    done; \
    if [ $$processed -eq 0 ]; then \
        echo "\033[1;33m⚠️  No markdown files found in generated/markdown folder\033[0m"; \
        echo "\033[1;33m💡 Tip: Run 'just compile-all' first to generate markdown files\033[0m"; \
    else \
        echo "✅ Converted $$processed/$$count sections to ICML"; \
    fi

# List all available sections
list-sections:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    echo "\033[1;36m╔══════════════════════════════════════════════════════════════╗\033[0m"
    echo "\033[1;36m║\033[0m                     \033[1m\033[1;37m📁 Available Sections\033[0m                     \033[1;36m║\033[0m"
    echo "\033[1;36m╚══════════════════════════════════════════════════════════════╝\033[0m"
    echo ""
    for dir in $SECTIONS_ROOT/*/; do
        if [ -d "$dir" ]; then
            section=$(basename "$dir")
            if [ -d "$dir/content" ]; then
                file_count=$(find "$dir/content" -name "$ALL_MD_PATTERN" -type f 2>/dev/null | wc -l | tr -d ' ')
                if [ "$file_count" -gt 0 ]; then
                    echo "  \033[1;32m✅ $section\033[0m \033[1m($file_count files)\033[0m"
                else
                    echo "  \033[1;33m⚠️  $section\033[0m \033[1;31m(no .md files)\033[0m"
                fi
            else
                echo "  \033[1;31m❌ $section\033[0m \033[1;31m(missing content/ folder)\033[0m"
            fi
        fi
    done
    echo ""
    echo "\033[1m\033[1;32mReady sections\033[0m can be compiled with: \033[1;37mjust compile <section-name>\033[0m"

# Remove hardcoded heading numbers from generated markdown files
remove-numbers:
    @echo "🔢 Removing hardcoded heading numbers from generated files..."
    @count=$$(find $MARKDOWN_OUTPUT -name "*.md" -type f | wc -l | tr -d ' ')
    @if [ $$count -eq 0 ]; then \
        echo "\033[1;33m⚠️  No generated markdown files found\033[0m"; \
        echo "\033[1;33m💡 Tip: Run 'just compile-all' first to generate files\033[0m"; \
        exit 0; \
    fi
    
    @# Process files in parallel using GNU Parallel
    @find $MARKDOWN_OUTPUT -name "*.md" -type f | \
        parallel --no-notice "section_name=\$(basename {} .md); \
            echo '   📝 Processing: '\$section_name'.md'; \
            perl -i -pe 's/^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\xc2\xa0]+/\$1 /g' {}"
    
    @echo "✅ Processed $$count markdown files in parallel"

# Scan markdown files and build anchor registry
scan-ref:
    @echo "🔍 Scanning anchors and building registry..."
    @just _scan-ref-internal

# Internal scan-ref function
_scan-ref-internal:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    mkdir -p $GENERATED_ROOT/data
    registry_file="$GENERATED_ROOT/data/crossref-registry.json"
    temp_file="$GENERATED_ROOT/data/crossref-registry.tmp"
    echo "{" > "$temp_file"
    echo '  "anchors": {' >> "$temp_file"
    anchor_count=0
    first_anchor=true
    for md_file in $MARKDOWN_OUTPUT/*.md; do
        if [ -f "$md_file" ]; then
            section_name=$(basename "$md_file" .md)
            echo "   📝 Scanning: $section_name.md"
            while IFS= read -r line; do
                anchor_matches=$(echo "$line" | grep -o '{#[a-zA-Z0-9_-]*}' | sed 's/{#\([^}]*\)}/\1/g' || true)
                if [ -n "$anchor_matches" ]; then
                    for anchor in $anchor_matches; do
                        if [ "$first_anchor" = "true" ]; then
                            first_anchor=false
                        else
                            echo "," >> "$temp_file"
                        fi
                        echo "    \"$anchor\": \"$section_name\"" >> "$temp_file"
                        anchor_count=$((anchor_count + 1))
                    done
                fi
            done < "$md_file"
        fi
    done
    echo "" >> "$temp_file"
    echo "  }," >> "$temp_file"
    echo "  \"metadata\": {" >> "$temp_file"
    echo "    \"generated_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$temp_file"
    echo "    \"total_anchors\": $anchor_count" >> "$temp_file"
    echo "  }" >> "$temp_file"
    echo "}" >> "$temp_file"
    mv "$temp_file" "$registry_file"
    if [ $anchor_count -eq 0 ]; then
        echo "\033[1;33m⚠️  No anchors found in generated markdown files\033[0m"
        echo "\033[1;33m💡 Tip: Make sure markdown files contain {#anchor-id} patterns\033[0m"
    else
        echo "✅ Registry built: $anchor_count anchors"
        echo "📄 Registry saved to: $registry_file"
    fi

# Extract citations and cross-references from generated markdown files
compile-data:
    @echo "📊 Extracting citations and cross-references..."
    @mkdir -p $GENERATED_ROOT/data
    @count=0; \
    processed=0; \
    for md_file in $MARKDOWN_OUTPUT/*.md; do \
        if [ -f "$$md_file" ]; then \
            section_name=$$(basename "$$md_file" .md); \
            output_file="$GENERATED_ROOT/data/$$section_name.ctcr.md"; \
            echo "   📝 Processing: $$section_name.md"; \
            grep -n '([^)]*)' "$$md_file" | sed 's/^\([0-9]*\):\(.*\)/- \2 @ [\1]/' > "$$output_file"; \
            if [ -s "$$output_file" ]; then \
                echo "   ✅ Extracted citations to: $$section_name.ctcr.md"; \
                processed=$$((processed + 1)); \
            else \
                echo "   ⚠️  No citations found in: $$section_name.md"; \
                rm -f "$$output_file"; \
            fi; \
            count=$$((count + 1)); \
        fi; \
    done; \
    if [ $$count -eq 0 ]; then \
        echo "\033[1;33m⚠️  No generated markdown files found\033[0m"; \
        echo "\033[1;33m💡 Tip: Run 'just compile-all' first to generate files\033[0m"; \
    else \
        echo "✅ Processed $$count markdown files, extracted data from $$processed files"; \
    fi

# Compile all valid sections
compile-all:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🚀 Compiling All Sections"

    # Get all valid sections
    valid_sections=()
    for dir in $SECTIONS_ROOT/*/; do
        if [ -d "$dir" ]; then
            section=$(basename "$dir")
            if [ -d "$dir/content" ] && [ -n "$(find $dir/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then
                valid_sections+=("$section")
            fi
        fi
    done

    if [ ${#valid_sections[@]} -eq 0 ]; then
        gum style --foreground 196 --bold "❌ No valid sections found"
        exit 1
    fi

    gum format -- "Found ${#valid_sections[@]} valid sections to compile"

    # Progress tracking
    total_sections=${#valid_sections[@]}
    current_section=0

    for section in "${valid_sections[@]}"; do
        ((current_section++))

        gum style \
            --foreground 51 --border single --align center \
            --width 50 --margin "1 0" --padding "1 2" \
            "Processing [$current_section/$total_sections]: $section"

        just _validate-section-internal "$section"
        just _merge-section-internal "$section"
        just _compile-icml-internal "$section"
    done

    gum style --foreground 51 "Building cross-reference registry..."
    just _scan-ref-internal

    gum style --foreground 46 --bold "🎉 All sections compiled and registry updated!"

# Compile all sections and remove heading numbers
compile-all-r:
    @echo "🚀 Compiling all sections with heading numbers removed..."
    @for dir in $SECTIONS_ROOT/*/; do \
        if [ -d "$$dir" ]; then \
            section=$$(basename "$$dir"); \
            if [ -d "$$dir/content" ] && [ -n "$$(find $$dir/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then \
                echo ""; \
                echo "🔨 Processing section: $$section"; \
                just _validate-section-internal $$section; \
                just _merge-section-internal $$section; \
                echo "   🔢 Removing heading numbers from: $$section.md"; \
                perl -i -pe 's/^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\xc2\xa0]+/$$1 /g' $MARKDOWN_OUTPUT/$$section.md; \
                just _compile-icml-internal $$section; \
            else \
                echo "⏭️  Skipping $$section (invalid structure or no files)"; \
            fi; \
        fi; \
    done
    @echo ""
    @echo "🔍 Scanning anchors and building registry..."
    @just _scan-ref-internal
    @echo ""
    @echo "🎉 All sections compiled with heading numbers removed and registry updated!"

# Compile all sections and update links
compile-all-u:
    @echo "🚀 Compiling all sections and updating links..."
    @for dir in $SECTIONS_ROOT/*/; do \
        if [ -d "$$dir" ]; then \
            section=$$(basename "$$dir"); \
            if [ -d "$$dir/content" ] && [ -n "$$(find $$dir/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then \
                echo ""; \
                echo "🔨 Processing section: $$section"; \
                just _validate-section-internal $$section; \
                just _merge-section-internal $$section; \
                just _compile-icml-internal $$section; \
            else \
                echo "⏭️  Skipping $$section (invalid structure or no files)"; \
            fi; \
        fi; \
    done
    @echo ""
    @echo "🔍 Scanning anchors and building registry..."
    @just _scan-ref-internal
    @echo ""
    @echo "🔗 Updating InDesign book document links..."
    @just update-links
    @echo ""
    @echo "🎉 All sections compiled, registry updated, and links updated!"

# Compile all sections, remove numbers, and update links
compile-all-ru:
    @echo "🚀 Compiling all sections with heading numbers removed and updating links..."
    @for dir in $SECTIONS_ROOT/*/; do \
        if [ -d "$$dir" ]; then \
            section=$$(basename "$$dir"); \
            if [ -d "$$dir/content" ] && [ -n "$$(find $$dir/content -name "$ALL_MD_PATTERN" -type f 2>/dev/null)" ]; then \
                echo ""; \
                echo "🔨 Processing section: $$section"; \
                just _validate-section-internal $$section; \
                just _merge-section-internal $$section; \
                echo "   🔢 Removing heading numbers from: $$section.md"; \
                perl -i -pe 's/^(#{1,6})\s*(\d+(?:\.\d+)*\.?)[\s\xc2\xa0]+/$$1 /g' $MARKDOWN_OUTPUT/$$section.md; \
                just _compile-icml-internal $$section; \
            else \
                echo "⏭️  Skipping $$section (invalid structure or no files)"; \
            fi; \
        fi; \
    done
    @echo ""
    @echo "🔍 Scanning anchors and building registry..."
    @just _scan-ref-internal
    @echo ""
    @echo "🔗 Updating InDesign book document links..."
    @just update-links
    @echo ""
    @echo "🎉 All sections compiled with heading numbers removed, registry updated, and links updated!"

# Clean all generated files
clean:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🧹 Generated Files Cleanup"

    # Count files to be cleaned
    md_count=$(find "$MARKDOWN_OUTPUT" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    icml_count=$(find "$ICML_OUTPUT" -name "*.icml" -type f 2>/dev/null | wc -l | tr -d ' ')
    data_count=$(find "$GENERATED_ROOT/data" -name "*.ctcr.md" -o -name "crossref-registry.json" 2>/dev/null | wc -l | tr -d ' ')

    gum format -- \
        "Files to be cleaned:" \
        "Markdown files: $md_count" \
        "ICML files: $icml_count" \
        "Data files: $data_count"

    if [ $((md_count + icml_count + data_count)) -eq 0 ]; then
        gum style --foreground 226 "📋 No generated files found to clean"
        exit 0
    fi

    if gum confirm "Delete all generated files?"; then
        gum spin --spinner dot --title "Cleaning generated files..." -- bash -c '
            rm -f "$MARKDOWN_OUTPUT"/*.md 2>/dev/null || true
            rm -f "$ICML_OUTPUT"/*.icml 2>/dev/null || true
            rm -f "$GENERATED_ROOT"/data/*.ctcr.md 2>/dev/null || true
            rm -f "$GENERATED_ROOT"/data/crossref-registry.json 2>/dev/null || true
        '
        gum style --foreground 46 --bold "✅ Cleanup complete"
    else
        gum style --foreground 226 "Cleanup cancelled"
    fi

#: Interactive compilation workflow selection using fzf
compilation-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 Compilation Workflow Selection"

    workflows=(
        "compile-interactive:Interactive single section compilation"
        "compile-all:Compile all valid sections"
        "compile-all-r:Compile all + remove heading numbers"
        "compile-all-u:Compile all + update InDesign links"
        "compile-all-ru:Compile all + remove numbers + update links"
        "list-sections:List all available sections"
        "remove-numbers:Remove heading numbers from generated files"
        "scan-ref:Build cross-reference registry"
        "compile-data:Extract citations and cross-references"
        "clean:Clean all generated files"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select compilation workflow: " \
            --header="Choose the compilation workflow to execute" \
            --border \
            --height=60% \
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
        "compile-section")
            section=$(gum input --placeholder "Enter section name")
            if [ -n "$section" ]; then
                just compile-section "$section"
            fi
            ;;
        *)
            just "$selected"
            ;;
    esac
