# IRA (Iterative Refinement and Authenticity) Workflow
# AI-powered text humanization and revision workflows

# Configuration

#: Apply IRA revision workflow to a source file
ira-revision source_file:
    #!/usr/bin/env bash
    set -euo pipefail

    # Validate source file
    if [ ! -f "{{source_file}}" ]; then
        gum style --foreground 196 --bold "❌ Error: Source file not found: {{source_file}}"
        gum style --foreground 226 "💡 Tip: Make sure the file path is correct and the file exists"
        exit 1
    fi

    gum style \
        --foreground 212 --border double --align center \
        --width 70 --margin "1 2" --padding "2 4" \
        "🚀 IRA Revision Workflow"

    # Display workflow information
    gum format -- \
        "Source File: {{source_file}}" \
        "Diagnostic Report: generated/reports/ira/$(basename "{{source_file}}" .md)-diagnostic-report.xml" \
        "" \
        "Workflow Steps:" \
        "1. 🔍 Load source markdown file" \
        "2. 📊 Auto-generate diagnostic report path" \
        "3. 🔄 Apply targeted revisions using AI agents" \
        "4. 📝 Generate revised file with tracking metadata" \
        "5. ✅ Ready for human review and iteration"

    if gum confirm "Start IRA revision workflow?"; then
        gum spin --spinner dot \
            --title "Starting IRA (Iterative Refinement and Authenticity) revision workflow..." -- \
            python3 "$SCRIPTS_ROOT/components/ira/ira_revision_orchestrator.py" "{{source_file}}"

        if [ $? -eq 0 ]; then
            gum style --foreground 46 --bold "✅ IRA Revision Workflow Complete!"
            gum format -- \
                "📤 Check the source file directory for the revised output file" \
                "📈 Review the revision tracking metadata in the output file" \
                "📊 Diagnostic report saved to: generated/reports/ira/"
        else
            gum style --foreground 196 --bold "❌ IRA Revision Workflow Failed"
            gum style --foreground 226 "💡 Check the error messages above for troubleshooting"
            exit 1
        fi
    else
        gum style --foreground 226 "IRA workflow cancelled"
    fi

#: Interactive IRA workflow with file selection using fzf
ira-interactive:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 Interactive IRA Workflow"

    # Find all markdown files in the generated directory
    if [ ! -d "$MARKDOWN_OUTPUT" ]; then
        gum style --foreground 196 --bold "❌ Error: Generated markdown directory not found"
        gum style --foreground 226 "💡 Run 'just compile-all' first to generate markdown files"
        exit 1
    fi

    md_files=($(find "$MARKDOWN_OUTPUT" -name "*.md" -type f 2>/dev/null))

    if [ ${#md_files[@]} -eq 0 ]; then
        gum style --foreground 196 --bold "❌ No markdown files found in $MARKDOWN_OUTPUT"
        gum style --foreground 226 "💡 Run 'just compile-all' first to generate markdown files"
        exit 1
    fi

    gum style --foreground 51 "Found ${#md_files[@]} markdown files for IRA processing"

    # Use fzf for file selection with preview
    selected_file=$(printf '%s\n' "${md_files[@]}" | \
        fzf --prompt="Select file for IRA revision: " \
            --header="Choose a markdown file to apply IRA revision workflow" \
            --border \
            --height=60% \
            --layout=reverse \
            --info=inline \
            --preview='head -20 {} | gum format' \
            --preview-window=right:50%:wrap)

    if [ -z "$selected_file" ]; then
        gum style --foreground 226 "File selection cancelled"
        exit 0
    fi

    # Execute IRA workflow on selected file
    just ira-revision "$selected_file"

#: Batch IRA processing for multiple files
ira-batch:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🔄 Batch IRA Processing"

    if [ ! -d "$MARKDOWN_OUTPUT" ]; then
        gum style --foreground 196 --bold "❌ Error: Generated markdown directory not found"
        exit 1
    fi

    md_files=($(find "$MARKDOWN_OUTPUT" -name "*.md" -type f 2>/dev/null))

    if [ ${#md_files[@]} -eq 0 ]; then
        gum style --foreground 196 --bold "❌ No markdown files found"
        exit 1
    fi

    gum format -- \
        "Batch IRA Processing" \
        "Found ${#md_files[@]} markdown files" \
        "" \
        "This will process all files sequentially with IRA revision."

    if ! gum confirm "Process all ${#md_files[@]} files with IRA revision?"; then
        gum style --foreground 226 "Batch processing cancelled"
        exit 0
    fi

    processed=0
    failed=0

    for file in "${md_files[@]}"; do
        file_name=$(basename "$file")
        gum style --foreground 51 "Processing [$((processed + failed + 1))/${#md_files[@]}]: $file_name"

        if python3 "$SCRIPTS_ROOT/components/ira/ira_revision_orchestrator.py" "$file"; then
            ((processed++))
            gum style --foreground 46 "✅ $file_name completed"
        else
            ((failed++))
            gum style --foreground 196 "❌ $file_name failed"
        fi

        echo ""
    done

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📊 Batch Processing Results"

    gum format -- \
        "Total files: ${#md_files[@]}" \
        "Processed successfully: $processed" \
        "Failed: $failed"

    if [ $failed -eq 0 ]; then
        gum style --foreground 46 --bold "🎉 All files processed successfully!"
    else
        gum style --foreground 226 "⚠️ Some files failed processing"
    fi

#: IRA workflow menu with multiple options
ira-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 IRA Workflow Selection"

    workflows=(
        "ira-interactive:Interactive file selection and single processing"
        "ira-batch:Batch process all markdown files"
        "ira-revision:Process specific file (provide file path)"
        "show-reports:View IRA diagnostic reports"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select IRA workflow: " \
            --header="Choose the IRA workflow to execute" \
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
        "ira-revision")
            file_path=$(gum input --placeholder "Enter full path to markdown file")
            if [ -n "$file_path" ]; then
                just ira-revision "$file_path"
            else
                gum style --foreground 226 "No file path provided"
            fi
            ;;
        "show-reports")
            just _show-ira-reports
            ;;
        *)
            just "$selected"
            ;;
    esac

#: Display IRA diagnostic reports
_show-ira-reports:
    #!/usr/bin/env bash
    set -euo pipefail

    reports_dir="$GENERATED_ROOT/reports/ira"

    if [ ! -d "$reports_dir" ]; then
        gum style --foreground 196 "❌ No IRA reports directory found"
        exit 1
    fi

    report_files=($(find "$reports_dir" -name "*-diagnostic-report.xml" -type f 2>/dev/null))

    if [ ${#report_files[@]} -eq 0 ]; then
        gum style --foreground 226 "📋 No IRA diagnostic reports found"
        gum style --foreground 51 "💡 Run IRA workflows to generate reports"
        exit 0
    fi

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📊 IRA Diagnostic Reports"

    selected_report=$(printf '%s\n' "${report_files[@]}" | \
        fzf --prompt="Select report to view: " \
            --header="Choose an IRA diagnostic report to examine" \
            --border \
            --height=60% \
            --layout=reverse \
            --info=inline \
            --preview='head -30 {} | gum format' \
            --preview-window=right:50%:wrap)

    if [ -n "$selected_report" ]; then
        gum style --foreground 51 "Viewing: $(basename "$selected_report")"
        if command -v code >/dev/null 2>&1; then
            code "$selected_report"
        elif command -v open >/dev/null 2>&1; then
            open "$selected_report"
        else
            cat "$selected_report" | gum format
        fi
    fi