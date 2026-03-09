#!/usr/bin/env python3
"""
Triple-Lens Review (TLR) Orchestrator

Prepares and manages peer review sessions for the thesis using three
reviewer perspectives: Advocate (constructive), Analyst (neutral),
and Adversary (devil's advocate).

Usage:
    python3 peer_review.py --mode section --section 1-introduccion
    python3 peer_review.py --mode global
    python3 peer_review.py --mode status
    python3 peer_review.py --mode prepare --section 1-introduccion
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# --- Configuration ---

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
SECTIONS_ROOT = PROJECT_ROOT / "sections"
MARKDOWN_ROOT = PROJECT_ROOT / "generated" / "markdown"
REPORTS_ROOT = PROJECT_ROOT / "generated" / "reports" / "drs"
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

REVIEWERS = ["advocate", "analyst", "adversary"]

# Sections to review (excluding bibliography and appendices)
REVIEWABLE_SECTIONS = [
    "1-introduccion",
    "2-metodologia",
    "3-fundamentos-1",
    "4-fundamentos-2",
    "5-marco-resistencia",
    "6-discusion",
    "7-conclusiones",
]

# Section display names
SECTION_NAMES = {
    "1-introduccion": "Introduccion",
    "2-metodologia": "Metodologia",
    "3-fundamentos-1": "Fundamentos Teoricos I",
    "4-fundamentos-2": "Fundamentos Teoricos II",
    "5-marco-resistencia": "Marco de Resistencia",
    "6-discusion": "Discusion",
    "7-conclusiones": "Conclusiones",
}

# ANSI colors
C = {
    "R": "\033[0m",
    "B": "\033[1m",
    "RED": "\033[1;31m",
    "GRN": "\033[1;32m",
    "YLW": "\033[1;33m",
    "BLU": "\033[1;34m",
    "PRP": "\033[1;35m",
    "CYN": "\033[1;36m",
    "WHT": "\033[1;37m",
}


def log(msg, color="R"):
    print(f"{C.get(color, '')}{msg}{C['R']}")


def load_prompt(reviewer: str) -> str:
    """Load a reviewer prompt template."""
    path = PROMPTS_DIR / f"{reviewer}.md"
    if not path.exists():
        log(f"Prompt file not found: {path}", "RED")
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def load_dimensions() -> str:
    """Load the shared evaluation dimensions."""
    path = PROMPTS_DIR / "dimensions.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_global_context() -> str:
    """Load global review context."""
    path = PROMPTS_DIR / "global.md"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def load_section_content(section: str) -> str:
    """Load the merged markdown content for a section."""
    path = MARKDOWN_ROOT / f"{section}.md"
    if not path.exists():
        log(f"Merged markdown not found: {path}", "RED")
        log("Run 'make merge-all' first to generate merged files.", "YLW")
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def ensure_output_dirs():
    """Create output directory structure."""
    for reviewer in REVIEWERS:
        (REPORTS_ROOT / "reviews" / reviewer).mkdir(parents=True, exist_ok=True)
    (REPORTS_ROOT / "synthesis").mkdir(parents=True, exist_ok=True)
    (REPORTS_ROOT / "metadata").mkdir(parents=True, exist_ok=True)


def build_review_prompt(reviewer: str, section: str, content: str, is_global: bool = False) -> str:
    """Build the complete review prompt for a given reviewer and section."""
    reviewer_prompt = load_prompt(reviewer)
    dimensions = load_dimensions()
    section_name = SECTION_NAMES.get(section, section)

    prompt_parts = [
        f"# Tarea de Revision\n\n",
        f"Revisa la siguiente seccion de una tesis doctoral utilizando la perspectiva y formato indicados.\n\n",
        f"**Seccion a revisar**: {section_name} ({section})\n\n",
        "---\n\n",
        "## Tu Rol y Perspectiva\n\n",
        reviewer_prompt,
        "\n\n---\n\n",
        "## Dimensiones de Evaluacion\n\n",
        dimensions,
        "\n\n---\n\n",
    ]

    if is_global:
        global_ctx = load_global_context()
        prompt_parts.extend([
            "## Contexto Global de la Tesis\n\n",
            global_ctx,
            "\n\n---\n\n",
        ])

    prompt_parts.extend([
        f"## Contenido a Revisar: {section_name}\n\n",
        "```markdown\n",
        content,
        "\n```\n\n",
        "---\n\n",
        "Procede con tu revision siguiendo estrictamente el formato de salida indicado en tu rol. ",
        "Escribe tu revision completa en espanol.\n",
    ])

    return "".join(prompt_parts)


def build_synthesis_prompt(section: str, reviews: dict[str, str]) -> str:
    """Build the synthesis prompt combining all three reviews."""
    synth_prompt = load_prompt("synthesizer")
    section_name = SECTION_NAMES.get(section, section)

    parts = [
        f"# Tarea de Sintesis\n\n",
        f"Sintetiza las siguientes tres revisiones independientes de la seccion **{section_name}** ({section}).\n\n",
        "---\n\n",
        "## Tu Rol\n\n",
        synth_prompt,
        "\n\n---\n\n",
    ]

    for reviewer, review_content in reviews.items():
        parts.extend([
            f"## Revision del {reviewer.capitalize()}\n\n",
            review_content,
            "\n\n---\n\n",
        ])

    parts.append("Procede con tu sintesis siguiendo estrictamente el formato indicado. Escribe en espanol.\n")

    return "".join(parts)


def cmd_prepare(args):
    """Prepare review prompts as files ready for use."""
    ensure_output_dirs()

    sections = REVIEWABLE_SECTIONS if args.section == "all" else [args.section]
    is_global = args.section == "all"

    for section in sections:
        content = load_section_content(section)
        section_name = SECTION_NAMES.get(section, section)
        log(f"\nPreparing review prompts for: {section_name}", "CYN")

        for reviewer in REVIEWERS:
            prompt = build_review_prompt(reviewer, section, content, is_global)
            out_path = REPORTS_ROOT / "reviews" / reviewer / f"{section}-prompt.md"
            out_path.write_text(prompt, encoding="utf-8")
            log(f"  {reviewer}: {out_path.relative_to(PROJECT_ROOT)}", "GRN")

    # Save session metadata
    session = {
        "timestamp": datetime.now().isoformat(),
        "mode": "global" if is_global else "section",
        "sections": sections,
        "reviewers": REVIEWERS,
        "status": "prompts_prepared",
    }
    meta_path = REPORTS_ROOT / "metadata" / "review-session.json"
    meta_path.write_text(json.dumps(session, indent=2, ensure_ascii=False), encoding="utf-8")

    log(f"\nPrompts prepared. {len(sections) * len(REVIEWERS)} review files created.", "GRN")
    log(f"Output directory: {REPORTS_ROOT.relative_to(PROJECT_ROOT)}", "WHT")


def cmd_status(args):
    """Show the status of current review session."""
    meta_path = REPORTS_ROOT / "metadata" / "review-session.json"

    if not meta_path.exists():
        log("No active review session found.", "YLW")
        log("Run 'make peer-review-prepare' to start a new session.", "WHT")
        return

    session = json.loads(meta_path.read_text(encoding="utf-8"))
    log("\nReview Session Status", "CYN")
    log("=" * 50)
    log(f"  Started: {session.get('timestamp', 'N/A')}", "WHT")
    log(f"  Mode: {session.get('mode', 'N/A')}", "WHT")
    log(f"  Status: {session.get('status', 'N/A')}", "WHT")
    log(f"  Sections: {len(session.get('sections', []))}", "WHT")

    # Check which reviews exist
    log("\nReview Completion:", "CYN")
    for section in session.get("sections", []):
        section_name = SECTION_NAMES.get(section, section)
        statuses = []
        for reviewer in REVIEWERS:
            review_path = REPORTS_ROOT / "reviews" / reviewer / f"{section}.md"
            prompt_path = REPORTS_ROOT / "reviews" / reviewer / f"{section}-prompt.md"
            if review_path.exists():
                statuses.append(f"{C['GRN']}done{C['R']}")
            elif prompt_path.exists():
                statuses.append(f"{C['YLW']}pending{C['R']}")
            else:
                statuses.append(f"{C['RED']}none{C['R']}")

        synth_path = REPORTS_ROOT / "synthesis" / f"{section}.md"
        synth_status = f"{C['GRN']}done{C['R']}" if synth_path.exists() else f"{C['YLW']}pending{C['R']}"

        log(f"  {section_name}:", "WHT")
        log(f"    Advocate: {statuses[0]}  Analyst: {statuses[1]}  Adversary: {statuses[2]}  Synthesis: {synth_status}")


def cmd_list(args):
    """List available sections for review."""
    log("\nAvailable Sections for Peer Review:", "CYN")
    log("=" * 50)
    for section in REVIEWABLE_SECTIONS:
        md_path = MARKDOWN_ROOT / f"{section}.md"
        name = SECTION_NAMES.get(section, section)
        if md_path.exists():
            size = md_path.stat().st_size
            words = len(md_path.read_text(encoding="utf-8").split())
            log(f"  {C['GRN']}ready{C['R']}  {name} ({section}) - ~{words:,} words", "WHT")
        else:
            log(f"  {C['RED']}no md{C['R']}  {name} ({section})", "WHT")


def cmd_prompt(args):
    """Output a single review prompt to stdout (for piping to AI agents)."""
    content = load_section_content(args.section)
    prompt = build_review_prompt(args.reviewer, args.section, content, is_global=False)
    print(prompt)


def cmd_synthesis_prompt(args):
    """Output a synthesis prompt to stdout."""
    reviews = {}
    for reviewer in REVIEWERS:
        review_path = REPORTS_ROOT / "reviews" / reviewer / f"{args.section}.md"
        if not review_path.exists():
            log(f"Missing review: {reviewer}/{args.section}.md", "RED")
            log("Complete all three reviews before synthesizing.", "YLW")
            sys.exit(1)
        reviews[reviewer] = review_path.read_text(encoding="utf-8")

    prompt = build_synthesis_prompt(args.section, reviews)
    print(prompt)


def main():
    parser = argparse.ArgumentParser(
        description="Triple-Lens Review (TLR) Orchestrator for PhD Thesis Peer Review"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # prepare
    p_prepare = subparsers.add_parser("prepare", help="Prepare review prompt files")
    p_prepare.add_argument(
        "--section", "-s", default="all",
        help="Section to review (e.g., 1-introduccion) or 'all'"
    )
    p_prepare.set_defaults(func=cmd_prepare)

    # status
    p_status = subparsers.add_parser("status", help="Show review session status")
    p_status.set_defaults(func=cmd_status)

    # list
    p_list = subparsers.add_parser("list", help="List available sections")
    p_list.set_defaults(func=cmd_list)

    # prompt (single prompt to stdout)
    p_prompt = subparsers.add_parser("prompt", help="Output a single review prompt to stdout")
    p_prompt.add_argument("--reviewer", "-r", required=True, choices=REVIEWERS)
    p_prompt.add_argument("--section", "-s", required=True)
    p_prompt.set_defaults(func=cmd_prompt)

    # synthesis-prompt
    p_synth = subparsers.add_parser("synthesis-prompt", help="Output synthesis prompt to stdout")
    p_synth.add_argument("--section", "-s", required=True)
    p_synth.set_defaults(func=cmd_synthesis_prompt)

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
