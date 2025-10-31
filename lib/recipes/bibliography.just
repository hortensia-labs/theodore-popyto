# Bibliography and Citation Management
# Comprehensive citation validation, bibliography processing, and formatting

# Configuration

#: Reformat bibliography ICML file paragraph styles (requires .env configuration)
reformat-bibliography:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📚 Bibliography Reformatting"

    if [ ! -f .env ]; then
        gum style --foreground 196 --bold "❌ Error: .env file not found"
        gum style --foreground 226 "💡 Create .env file with BIBLIOGRAPHY_SECTION variable"
        exit 1
    fi

    source .env

    if [ -z "${BIBLIOGRAPHY_SECTION:-}" ]; then
        gum style --foreground 196 --bold "❌ Error: BIBLIOGRAPHY_SECTION not set in .env file"
        gum format -- "Required variable in .env:" "- BIBLIOGRAPHY_SECTION=<section_name>"
        exit 1
    fi

    bibliography_file="$ICML_OUTPUT/$BIBLIOGRAPHY_SECTION.icml"
    if [ ! -f "$bibliography_file" ]; then
        gum style --foreground 196 --bold "❌ Error: Bibliography ICML file not found"
        echo "Expected: $bibliography_file"
        exit 1
    fi

    gum spin --spinner dot --title "Reformatting bibliography paragraph styles..." -- \
        python3 "$SCRIPTS_ROOT/format-bibliography-icml.py" "$bibliography_file"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "🎉 Bibliography reformatted successfully!"
    else
        gum style --foreground 196 --bold "❌ Error: Failed to reformat bibliography"
        exit 1
    fi

#: Comprehensive citation validation workflow
validate-citations:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🔍 Citation Validation Workflow"

    # Progress tracking for validation workflow
    total_steps=5
    current_step=0

    gum format -- "Starting comprehensive citation validation..."

    # Step 1: Extraction
    ((current_step++))
    gum style --foreground 51 "[$current_step/$total_steps] Extracting citations..."
    python3 "$SCRIPTS_ROOT/components/crv/validate_citations.py"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "✅ Citation validation complete!"
        gum format -- \
            "📊 Reports available at:" \
            "  • generated/reports/crv/final/validation-report.md" \
            "  • generated/reports/crv/final/action-items.md" \
            "  • generated/reports/crv/final/validation-summary.json"
    else
        gum style --foreground 196 --bold "❌ Citation validation failed"
        exit 1
    fi

#: Quick citation validation (no AI analysis)
validate-citations-quick:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "⚡ Quick Citation Validation"

    gum spin --spinner dot --title "Running quick citation validation..." -- \
        python3 "$SCRIPTS_ROOT/components/crv/validate_citations.py" --no-agent

    gum style --foreground 46 "✅ Quick validation complete!"

#: Run specific validation step
validate-citations-step step:
    #!/usr/bin/env bash
    set -euo pipefail

    valid_steps=("extraction" "bibliography" "validation" "agent" "reports")

    if [[ ! " ${valid_steps[@]} " =~ " {{step}} " ]]; then
        gum style --foreground 196 --bold "❌ Error: Invalid step '{{step}}'"
        gum format -- "Available steps:" "${valid_steps[@]/#/- }"
        exit 1
    fi

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔍 Validation Step: {{step}}"

    gum spin --spinner dot --title "Running validation step: {{step}}..." -- \
        python3 "$SCRIPTS_ROOT/components/crv/validate_citations.py" --step "{{step}}"

    gum style --foreground 46 "✅ Step '{{step}}' completed!"

#: Extract citations only
extract-citations:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📝 Citation Extraction"

    gum spin --spinner dot --title "Extracting citations from thesis content..." -- \
        python3 "$SCRIPTS_ROOT/components/crv/extract_citations.py"

    gum style --foreground 46 --bold "✅ Citations extracted to generated/reports/crv/inline-citations.md"

#: Process bibliography entries only
process-bibliography:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📚 Bibliography Processing"

    gum spin --spinner dot --title "Processing bibliography entries..." -- \
        python3 "$SCRIPTS_ROOT/components/crv/process_bibliography.py"

    gum style --foreground 46 --bold "✅ Bibliography processed successfully"

#: Generate validation report only (requires previous steps)
generate-validation-report:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📊 Validation Report Generation"

    gum spin --spinner dot --title "Generating validation report..." -- \
        python3 "$SCRIPTS_ROOT/components/crv/generate_report.py"

    gum style --foreground 46 --bold "✅ Report generated at generated/reports/crv/final/"

#: Interactive citation workflow selection using fzf
citation-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 Citation Workflow Selection"

    workflows=(
        "validate-citations:Complete citation validation with AI analysis"
        "validate-citations-quick:Quick validation without AI analysis"
        "extract-citations:Extract citations only"
        "process-bibliography:Process bibliography entries only"
        "generate-validation-report:Generate validation report"
        "reformat-bibliography:Reformat bibliography ICML styles"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select citation workflow: " \
            --header="Choose the citation management workflow to execute" \
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
        "validate-citations-step")
            step=$(gum input --placeholder "Enter step (extraction, bibliography, validation, agent, reports)")
            if [ -n "$step" ]; then
                just validate-citations-step "$step"
            fi
            ;;
        *)
            just "$selected"
            ;;
    esac