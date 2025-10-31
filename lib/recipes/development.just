# Development and Testing Utilities
# Development tools, testing utilities, and system maintenance

# Configuration

#: Initialize development environment with required dependencies
init:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🚀 Development Environment Setup"

    dependencies=("gum" "fzf" "parallel")
    missing_deps=()

    # Check existing dependencies
    for dep in "${dependencies[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done

    if [ ${#missing_deps[@]} -eq 0 ]; then
        gum style --foreground 46 --bold "✅ All dependencies are already installed!"
        gum format -- "${dependencies[@]/#/✓ }"
        exit 0
    fi

    gum format -- \
        "Missing dependencies:" \
        "${missing_deps[@]/#/- }"

    if gum confirm "Install missing dependencies with Homebrew?"; then
        for dep in "${missing_deps[@]}"; do
            gum spin --spinner dot --title "Installing $dep..." -- brew install "$dep"
        done

        gum style --foreground 46 --bold "🎉 Development environment setup complete!"
    else
        gum style --foreground 226 "Installation cancelled"
    fi

#: Clean all generated files with confirmation
clean-generated:
    #!/usr/bin/env bash
    set -euo pipefail

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

#: System health check and diagnostics
health-check:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔍 System Health Check"

    health_score=0
    total_checks=0

    # Check 1: Required dependencies
    ((total_checks++))
    dependencies=("gum" "fzf" "parallel" "pandoc" "python3" "perl")
    missing_deps=()

    for dep in "${dependencies[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done

    if [ ${#missing_deps[@]} -eq 0 ]; then
        gum style --foreground 46 "✅ All required dependencies installed"
        ((health_score++))
    else
        gum style --foreground 196 "❌ Missing dependencies: ${missing_deps[*]}"
    fi

    # Check 2: Directory structure
    ((total_checks++))
    required_dirs=("$GENERATED_ROOT" "$MARKDOWN_OUTPUT" "$ICML_OUTPUT")
    missing_dirs=()

    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            missing_dirs+=("$dir")
        fi
    done

    if [ ${#missing_dirs[@]} -eq 0 ]; then
        gum style --foreground 46 "✅ Directory structure is valid"
        ((health_score++))
    else
        gum style --foreground 196 "❌ Missing directories: ${missing_dirs[*]}"
    fi

    # Check 3: Python scripts
    ((total_checks++))
    python_scripts=(
        "/Users/henry/Workbench/Theodore/lib/compile-icml-processor.py"
        "/Users/henry/Workbench/Theodore/lib/list-thesis-sections.py"
    )
    missing_scripts=()

    for script in "${python_scripts[@]}"; do
        if [ ! -f "$script" ]; then
            missing_scripts+=("$script")
        fi
    done

    if [ ${#missing_scripts[@]} -eq 0 ]; then
        gum style --foreground 46 "✅ Core Python scripts found"
        ((health_score++))
    else
        gum style --foreground 196 "❌ Missing Python scripts: ${#missing_scripts[@]}"
    fi

    # Check 4: Configuration
    ((total_checks++))
    if [ -f .env ]; then
        gum style --foreground 46 "✅ Environment configuration found"
        ((health_score++))
    else
        gum style --foreground 226 "⚠️ .env file not found (optional)"
        ((health_score++))  # Don't penalize for optional config
    fi

    # Health score calculation
    percentage=$((health_score * 100 / total_checks))

    gum style \
        --foreground 212 --border single --align center \
        --width 40 --margin "1 2" --padding "1 2" \
        "Health Score: $health_score/$total_checks ($percentage%)"

    if [ $health_score -eq $total_checks ]; then
        gum style --foreground 46 --bold "🎉 System is healthy!"
    elif [ $health_score -ge $((total_checks * 3 / 4)) ]; then
        gum style --foreground 226 "⚠️ System has minor issues"
    else
        gum style --foreground 196 "❌ System has significant issues"
        exit 1
    fi

#: Project statistics and overview
stats:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📊 Project Statistics"

    # Section statistics
    sections_dir="/Users/henry/Workbench/Theodore/sections"
    total_sections=$(find "$sections_dir" -maxdepth 1 -type d | wc -l | tr -d ' ')
    total_sections=$((total_sections - 1))  # Exclude parent directory

    valid_sections=0
    total_md_files=0

    for section_dir in "$sections_dir"/*/; do
        if [ -d "$section_dir/content" ]; then
            md_count=$(find "$section_dir/content" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
            if [ "$md_count" -gt 0 ]; then
                ((valid_sections++))
                total_md_files=$((total_md_files + md_count))
            fi
        fi
    done

    # Generated files statistics
    generated_md=$(find "$MARKDOWN_OUTPUT" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    generated_icml=$(find "$ICML_OUTPUT" -name "*.icml" -type f 2>/dev/null | wc -l | tr -d ' ')

    # Word count estimation (if files exist)
    total_words=0
    if [ "$generated_md" -gt 0 ]; then
        for file in "$MARKDOWN_OUTPUT"/*.md; do
            if [ -f "$file" ]; then
                words=$(wc -w < "$file" 2>/dev/null || echo 0)
                total_words=$((total_words + words))
            fi
        done
    fi

    gum format -- \
        "Content Statistics:" \
        "Total sections: $total_sections" \
        "Valid sections: $valid_sections" \
        "Source markdown files: $total_md_files" \
        "" \
        "Generated Files:" \
        "Merged markdown files: $generated_md" \
        "ICML files: $generated_icml" \
        "" \
        "Content Volume:" \
        "Estimated total words: $total_words"

#: Development workflow selection menu
dev-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🛠️ Development Workflow Selection"

    workflows=(
        "init:Initialize development environment"
        "health-check:Run system health diagnostics"
        "stats:View project statistics"
        "clean:Clean all generated files"
        "clean-validation:Clean validation cache"
        "test-all:Run all available tests"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select development workflow: " \
            --header="Choose the development workflow to execute" \
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
        "test-all")
            gum style --foreground 51 "Running all available tests..."
            just test-citations
            just validate-file-integrity
            just health-check
            gum style --foreground 46 --bold "🎉 All tests completed!"
            ;;
        "clean-validation")
            just clean-validation
            ;;
        *)
            just "$selected"
            ;;
    esac

#: Quick development setup for new users
quick-setup:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🚀 Quick Development Setup"

    gum format -- \
        "This will set up the complete development environment:" \
        "1. Install required dependencies" \
        "2. Create necessary directories" \
        "3. Run health check" \
        "4. Display project statistics"

    if gum confirm "Proceed with quick setup?"; then
        # Step 1: Install dependencies
        just init

        # Step 2: Create directories
        gum spin --spinner dot --title "Creating necessary directories..." -- bash -c '
            mkdir -p "$GENERATED_ROOT"/{markdown,icml,data,reports/{crv,ira}}
            mkdir -p references/{data,logs,reports}
            mkdir -p tests
        '

        # Step 3: Health check
        just health-check

        # Step 4: Statistics
        just stats

        gum style --foreground 46 --bold "🎉 Quick setup completed successfully!"
        gum format -- \
            "Next steps:" \
            "- Run 'just list-sections' to see available content" \
            "- Use 'just compile-all' to process all sections" \
            "- Try 'just --list' to see all available commands"
    else
        gum style --foreground 226 "Setup cancelled"
    fi