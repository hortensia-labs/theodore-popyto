import 'lib/recipes/compilation.just'
import 'lib/recipes/indesign.just'
import 'lib/recipes/bibliography.just'
import 'lib/recipes/validation.just'
import 'lib/recipes/ira.just'
import 'lib/recipes/development.just'
import 'lib/recipes/config.just'

set shell := ["zsh", "-cu"]

# Aliases for common operations
alias c := compile
alias ci := compile-interactive
alias cw := compilation-workflow
alias iw := indesign-workflow
alias bw := citation-workflow
alias vw := validation-workflow
alias dev := dev-workflow
alias setup := quick-setup

#: Default compilation workflow (full pipeline)
compile:
    just compile-all-ru

#: Master workflow selector - interactive menu for all available workflows
workflow:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 70 --margin "1 2" --padding "2 4" \
        "🎯 Theodore Master Workflow Selection"

    categories=(
        "compilation-workflow:📝 Compilation & Processing Workflows"
        "indesign-workflow:🎨 InDesign Automation & Layout"
        "citation-workflow:📚 Citation & Bibliography Management"
        "validation-workflow:🔍 Validation & Quality Assurance"
        "ira-workflow:🤖 AI Revision & Text Enhancement"
        "dev-workflow:🛠️ Development & System Utilities"
    )

    selected=$(printf '%s\n' "${categories[@]}" | \
        fzf --prompt="Select workflow category: " \
            --header="Choose a workflow category to explore available options" \
            --border \
            --height=40% \
            --layout=reverse \
            --info=inline \
            --preview='echo {}' \
            --preview-window=up:3:wrap | \
        cut -d: -f1)

    if [ -z "$selected" ]; then
        gum style --foreground 226 "Workflow selection cancelled"
        exit 0
    fi

    just "$selected"

#: Quick help and status overview
help:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 70 --margin "1 2" --padding "2 4" \
        "📚 Theodore Thesis Build System"

    gum format -- \
        "Welcome to the enhanced Theodore thesis build system!" \
        "" \
        "🚀 Quick Start Commands:" \
        "  just workflow          - Interactive workflow selector" \
        "  just compile          - Compile all sections (full pipeline)" \
        "  just ci               - Interactive section compilation" \
        "  just setup            - Quick development environment setup" \
        "" \
        "📂 Workflow Categories:" \
        "  just cw               - Compilation workflows" \
        "  just iw               - InDesign automation" \
        "  just bw               - Citations & bibliography" \
        "  just vw               - Validation & testing" \
        "  just dev              - Development utilities" \
        "" \
        "🔍 System Information:" \
        "  just list-sections    - View available thesis sections" \
        "  just stats            - Project statistics" \
        "  just health-check     - System diagnostics" \
        "" \
        "📖 For detailed help: just --list"

#: Show system status and project overview
status:
    #!/usr/bin/env bash
    set -euo pipefail

    gum style \
        --foreground 212 --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "📊 System Status Overview"

    # Quick system check
    just health-check

    echo ""

    # Project statistics
    just stats

    echo ""

    # Available sections
    just list-sections
