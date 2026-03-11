#!/usr/bin/env bash
# ============================================================================
# gum-helpers.sh — Styled terminal output helpers (charmbracelet/gum)
# ============================================================================
# Source this file in bash shebang recipes for consistent styled output.
# Falls back gracefully to plain echo when gum is not installed.
# ============================================================================

HAS_GUM=false
command -v gum >/dev/null 2>&1 && HAS_GUM=true

# ── Color Palette (ANSI-256) ─────────────────────────────────────────────────
COLOR_PRIMARY="212"    # Pink/magenta — banners, titles
COLOR_BORDER="99"      # Purple — borders, separators
COLOR_COMPILE="75"     # Blue — compilation phase
COLOR_BIBLIO="213"     # Magenta — bibliography phase
COLOR_INDESIGN="81"    # Cyan — InDesign phase
COLOR_SUCCESS="78"     # Green — success messages

# ── banner: Major section header with double border ──────────────────────────
# Usage: banner "Title Text"
banner() {
    if $HAS_GUM; then
        echo ""
        gum style \
            --border double --align center --width 60 \
            --padding "1 2" --bold \
            --foreground "$COLOR_PRIMARY" \
            --border-foreground "$COLOR_BORDER" \
            "$@"
    else
        echo ""
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║         $*"
        echo "╚══════════════════════════════════════════════════════════════╝"
    fi
    echo ""
}

# ── phase: Numbered phase header with colored border ─────────────────────────
# Usage: phase <color_code> "FASE N: Title"
phase() {
    local color="${1}"
    shift
    if $HAS_GUM; then
        gum style \
            --bold --foreground "$color" \
            --border normal --border-foreground "$color" \
            --width 50 --padding "0 1" \
            "$@"
    else
        echo "$*"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
}

# ── step: Progress step indicator ────────────────────────────────────────────
# Usage: step "1/4" "Description of the step..."
step() {
    local prefix="$1"
    shift
    if $HAS_GUM; then
        echo "  $(gum style --foreground "$COLOR_COMPILE" --bold "▸ $prefix") $(gum style --bold "$*")"
    else
        echo "Paso $prefix: $*"
    fi
}

# ── warn: Warning message ───────────────────────────────────────────────────
# Usage: warn "Important warning text"
warn() {
    if $HAS_GUM; then
        gum log --level warn "$@"
    else
        echo "⚠️  $*"
    fi
}

# ── success: Completion/success message ──────────────────────────────────────
# Usage: success "Task completed!"
success() {
    if $HAS_GUM; then
        gum style --foreground "$COLOR_SUCCESS" --bold "✓ $*"
    else
        echo "$*"
    fi
}

# ── err: Error message ──────────────────────────────────────────────────────
# Usage: err "Something went wrong"
err() {
    if $HAS_GUM; then
        gum log --level error "$@"
    else
        echo "ERROR: $*" >&2
    fi
}

# ── heading: Bold colored text ───────────────────────────────────────────────
# Usage: heading "Section title"
heading() {
    if $HAS_GUM; then
        gum style --bold --foreground "$COLOR_PRIMARY" "$@"
    else
        echo "$*"
    fi
}

# ── separator: Horizontal rule ───────────────────────────────────────────────
# Usage: separator
separator() {
    if $HAS_GUM; then
        gum style --foreground "$COLOR_BORDER" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
}

# ── info: General informational message ──────────────────────────────────────
# Usage: info "Processing something..."
info() {
    if $HAS_GUM; then
        gum log --level info "$@"
    else
        echo "$*"
    fi
}
