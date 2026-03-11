#!/usr/bin/env bash
# ============================================================================
# log.sh — Lightweight logging wrapper for justfile recipes
# ============================================================================
# Invocable directly (no need to source) for single-line recipes.
# Uses gum for styled output when available, plain echo otherwise.
#
# Usage:
#   bash lib/log.sh info "Processing libro1..."
#   bash lib/log.sh warn "Something might be wrong"
#   bash lib/log.sh error "Something went wrong"
# ============================================================================

HAS_GUM=false
command -v gum >/dev/null 2>&1 && HAS_GUM=true

level="${1:-info}"
shift
message="$*"

case "$level" in
    info)
        if $HAS_GUM; then
            gum log --level info "$message"
        else
            echo "$message"
        fi
        ;;
    warn)
        if $HAS_GUM; then
            gum log --level warn "$message"
        else
            echo "WARNING: $message"
        fi
        ;;
    error)
        if $HAS_GUM; then
            gum log --level error "$message"
        else
            echo "ERROR: $message" >&2
        fi
        ;;
    *)
        echo "$message"
        ;;
esac
