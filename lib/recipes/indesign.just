# InDesign Automation and Integration
# Comprehensive Adobe InDesign workflow automation
# All configuration loaded from environment variables (.env file)

#: Update InDesign book document links using AppleScript
update-links:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    source .env

    gum style \
        --foreground $COLOR_PURPLE --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔗 InDesign Link Update"

    if [ ! -f "$SCRIPTS_ROOT/adobe/update-links-of-book-documents.applescript" ]; then
        gum style --foreground $COLOR_RED --bold "❌ Error: AppleScript not found"
        echo "Missing: $SCRIPTS_ROOT/adobe/update-links-of-book-documents.applescript"
        exit 1
    fi

    gum spin --spinner dot --title "Updating InDesign book document links..." -- \
        osascript "$SCRIPTS_ROOT/adobe/update-links-of-book-documents.applescript"

    if [ $? -eq 0 ]; then
        gum style --foreground $COLOR_GREEN --bold "✅ InDesign book document links updated successfully!"
    else
        gum style --foreground $COLOR_RED --bold "❌ Error: Failed to update InDesign book document links"
        gum style --foreground $COLOR_YELLOW "💡 Tip: Make sure InDesign is running and the book document is open"
        exit 1
    fi

#: Update InDesign book (synchronize styles, update numbers, preflight)
update-book:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📚 InDesign Book Update"

    if [ ! -f "$SCRIPTS_ROOT/adobe/book-sync-update-preflight.applescript" ]; then
        gum style --foreground 196 --bold "❌ Error: AppleScript not found"
        echo "Missing: $SCRIPTS_ROOT/adobe/book-sync-update-preflight.applescript"
        exit 1
    fi

    gum spin --spinner dot --title "Updating InDesign book (sync styles, update numbers, preflight)..." -- \
        osascript "$SCRIPTS_ROOT/adobe/book-sync-update-preflight.applescript"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "✅ InDesign book updated successfully!"
        gum format -- "- Styles synchronized" "- Numbers updated" "- Preflight completed"
    else
        gum style --foreground 196 --bold "❌ Error: Failed to update InDesign book"
        gum style --foreground 226 "💡 Tip: Make sure InDesign is running and the book document is open"
        exit 1
    fi

#: Process cross-references in InDesign book documents
crossref-process:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "🔗 Cross-Reference Processing"

    if [ ! -f "$SCRIPTS_ROOT/adobe/runner.applescript" ]; then
        gum style --foreground 196 --bold "❌ Error: AppleScript not found"
        echo "Missing: $SCRIPTS_ROOT/adobe/runner.applescript"
        exit 1
    fi

    if [ ! -f "$SCRIPTS_ROOT/adobe/crossref-process.jsx" ]; then
        gum style --foreground 196 --bold "❌ Error: JSX script not found"
        echo "Missing: $SCRIPTS_ROOT/adobe/crossref-process.jsx"
        exit 1
    fi

    gum spin --spinner dot --title "Processing cross-references in InDesign book documents..." -- \
        osascript "$SCRIPTS_ROOT/adobe/runner.applescript" "crossref-process.jsx"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "✅ Cross-references processed successfully in all InDesign book documents!"
    else
        gum style --foreground 196 --bold "❌ Error: Failed to process cross-references"
        gum style --foreground 226 "💡 Tip: Make sure InDesign is running and the book document is open"
        exit 1
    fi

#: Update Table of Contents in InDesign (requires .env configuration)
update-toc:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 50 --margin "1 2" --padding "2 4" \
        "📑 Table of Contents Update"

    if [ ! -f .env ]; then
        gum style --foreground 196 --bold "❌ Error: .env file not found"
        gum style --foreground 226 "💡 Create .env file with TOC_DOCUMENT and TOC_STYLE variables"
        exit 1
    fi

    source .env

    if [ -z "${TOC_DOCUMENT:-}" ] || [ -z "${TOC_STYLE:-}" ]; then
        gum style --foreground 196 --bold "❌ Error: TOC_DOCUMENT and/or TOC_STYLE not set in .env file"
        gum format -- "Required variables in .env:" "- TOC_DOCUMENT=<document_name>" "- TOC_STYLE=<style_name>"
        exit 1
    fi

    gum spin --spinner dot --title "Updating Table of Contents..." -- \
        osascript "$SCRIPTS_ROOT/adobe/update-toc.applescript" "$TOC_DOCUMENT" "$TOC_STYLE"

    if [ $? -eq 0 ]; then
        gum style --foreground 46 --bold "🎉 Table of Contents updated successfully!"
    else
        gum style --foreground 196 --bold "❌ Error: Failed to update Table of Contents"
        exit 1
    fi

#: Interactive InDesign workflow selection using fzf
indesign-workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "🎯 InDesign Workflow Selection"

    workflows=(
        "update-links:Update book document links"
        "update-book:Sync styles, update numbers, preflight"
        "crossref-process:Process cross-references"
        "update-toc:Update Table of Contents"
        "full-workflow:Complete workflow (all steps)"
    )

    selected=$(printf '%s\n' "${workflows[@]}" | \
        fzf --prompt="Select InDesign workflow: " \
            --header="Choose the InDesign automation workflow to execute" \
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
        "full-workflow")
            gum confirm "Execute complete InDesign workflow?" && {
                just update-links
                just update-book
                just crossref-process
                just update-toc
                gum style --foreground 46 --bold "🎉 Complete InDesign workflow finished!"
            }
            ;;
        *)
            just "$selected"
            ;;
    esac