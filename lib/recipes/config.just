# Configuration Management
# Load environment variables and provide common utilities

#: Load environment variables from .env file
_load-env:
    #!/usr/bin/env bash
    if [ -f .env ]; then
        set -a  # automatically export all variables
        source .env
        set +a
    else
        echo "❌ Error: .env file not found in project root"
        exit 1
    fi

#: Install required development dependencies
install-deps:
    @brew install gum fzf parallel

#: Validate environment configuration
validate-config:
    #!/usr/bin/env bash
    set -euo pipefail

    # Load environment variables
    if [ -f .env ]; then
        source .env
    else
        gum style --foreground ${COLOR_RED:-196} "❌ .env file not found"
        exit 1
    fi

    # Check required variables
    required_vars=(
        "PROJECT_ROOT"
        "SECTIONS_ROOT"
        "GENERATED_ROOT"
        "MARKDOWN_OUTPUT"
        "ICML_OUTPUT"
        "SCRIPTS_ROOT"
    )

    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        gum style --foreground ${COLOR_RED:-196} "❌ Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}" | while read -r var; do
            echo "  - $var"
        done
        exit 1
    fi

    gum style --foreground ${COLOR_GREEN:-46} "✅ Environment configuration is valid"

#: Show current configuration
show-config:
    #!/usr/bin/env bash
    set -euo pipefail

    if [ -f .env ]; then
        source .env
    else
        echo "❌ .env file not found"
        exit 1
    fi

    gum style \
        --foreground ${COLOR_PURPLE:-212} --border double --align center \
        --width 60 --margin "1 2" --padding "2 4" \
        "⚙️ Project Configuration"

    gum format -- \
        "Core Paths:" \
        "  Project Root: $PROJECT_ROOT" \
        "  Sections: $SECTIONS_ROOT" \
        "  Generated: $GENERATED_ROOT" \
        "  Scripts: $SCRIPTS_ROOT" \
        "" \
        "Output Directories:" \
        "  Markdown: $MARKDOWN_OUTPUT" \
        "  ICML: $ICML_OUTPUT" \
        "" \
        "InDesign Settings:" \
        "  Bibliography Section: $BIBLIOGRAPHY_SECTION" \
        "  TOC Document: $TOC_DOCUMENT" \
        "  TOC Style: $TOC_STYLE"
