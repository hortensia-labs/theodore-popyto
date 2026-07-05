# Triple-Lens Review (TLR) - Peer Review System

A multi-perspective peer review system for the PhD thesis using three reviewer agents with distinct perspectives.

## Overview

The TLR system uses three reviewers to evaluate each thesis section:

| Reviewer | Perspective | Focus |
|----------|------------|-------|
| **Advocate** | Constructive | Strengths, potential, growth opportunities |
| **Analyst** | Neutral | Systematic, criteria-based evaluation |
| **Adversary** | Devil's advocate | Stress-testing arguments, finding blind spots |

A fourth agent (Synthesizer) combines all three reviews into a unified report.

## Quick Start

### Via Makefile

```bash
# See system info and commands
make peer-review

# Prepare prompts for all sections
make peer-review-prepare

# Prepare prompts for one section
make peer-review-section 1-introduccion

# Check progress
make peer-review-status

# List available sections
make peer-review-list
```

### Via Claude Code

Ask Claude Code directly:

```
Run a peer review of section 1-introduccion using the TLR system
```

Or for the full thesis:

```
Run a full triple-lens peer review of the thesis
```

Claude Code will use the prompt templates from `lib/components/drs/prompts/` to run three parallel review agents and then synthesize the results.

### Via Cursor

Reference the `.cursor/rules/peer-review.mdc` file. The rule is configured to trigger when you mention "peer review", "revision", or "TLR" in the chat.

## Workflow

1. **Prepare** - Generate review prompts (embeds section content into reviewer templates)
2. **Review** - Run each reviewer agent (3 per section, can run in parallel)
3. **Synthesize** - Combine three perspectives into unified report
4. **Act** - Follow the prioritized action plan

## Output Structure

```
generated/reports/drs/
├── reviews/
│   ├── advocate/        # Constructive reviews
│   │   ├── 1-introduccion.md
│   │   └── ...
│   ├── analyst/         # Analytical reviews
│   └── adversary/       # Adversarial reviews
├── synthesis/           # Synthesized reports
│   ├── 1-introduccion.md
│   └── ...
└── metadata/
    └── review-session.json
```

## Evaluation Dimensions

Each reviewer evaluates 8 dimensions with different weights:

1. **Estructura y Organizacion** - Section structure, logical flow
2. **Argumentacion y Coherencia** - Reasoning chains, logical consistency
3. **Rigor Metodologico** - Method appropriateness, transparency
4. **Fundamentacion y Evidencia** - Source quality, citation adequacy
5. **Redaccion y Tono** - Writing quality, academic register
6. **Continuidad y Flujo** - Transitions, narrative arc
7. **Integridad Academica** - Attribution, citation format
8. **Contribucion al Campo** - Originality, impact

## File Structure

```
lib/components/drs/
├── peer_review.py           # Orchestrator script
├── prompts/
│   ├── dimensions.md        # Shared evaluation dimensions
│   ├── advocate.md          # Constructive reviewer prompt
│   ├── analyst.md           # Analytical reviewer prompt
│   ├── adversary.md         # Adversarial reviewer prompt
│   ├── synthesizer.md       # Synthesis prompt
│   └── global.md            # Global thesis context
├── README.md                # This file
├── drs-prd.md               # Original PRD (reference)
└── agents.md                # Original agent specs (reference)
```
