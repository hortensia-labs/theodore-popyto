# Triple-Lens Peer Review (TLR) — Cursor Launch Prompt

Copy and paste the following prompt into Cursor's agent chat to launch a full peer review session. Replace `<SECTION>` with the section you want to review, or use the full-thesis variant at the bottom.

---

## Single Section Review Prompt

```
I need you to run a Triple-Lens Peer Review (TLR) on thesis section `<SECTION>`.

This system uses three independent reviewer perspectives to evaluate the same content. You will perform each review sequentially, fully inhabiting the assigned persona for each pass. Do NOT let one review influence the others — treat each as a fresh, independent reading.

### Setup

1. Read the evaluation dimensions: `lib/components/drs/prompts/dimensions.md`
2. Read the thesis context: `lib/components/drs/prompts/global.md`
3. Read the section content: `generated/markdown/<SECTION>.md`

### Pass 1: Advocate (Constructive Reviewer)

Read the reviewer instructions at `lib/components/drs/prompts/advocate.md`.

You are now the Advocate — a committee member focused on identifying what works, why it works, and how to amplify it. Your guiding question: "What makes this work valuable and how can it be even better?"

- Identify at least 5 concrete strengths with textual evidence
- Frame areas for improvement as growth opportunities
- Score all 8 dimensions (1-10 scale)
- Follow the exact output format from the prompt file
- Write entirely in Spanish

Save your review to: `generated/reports/drs/reviews/advocate/<SECTION>.md`

### Pass 2: Analyst (Neutral Reviewer)

Read the reviewer instructions at `lib/components/drs/prompts/analyst.md`.

You are now the Analyst — a systematic, criteria-driven evaluator with no bias toward optimism or pessimism. Your guiding question: "Does this work meet doctoral standards, and what evidence supports that assessment?"

- Map the argumentative structure: premises → evidence → conclusions
- Verify each significant claim against the evidence presented
- Identify gaps, unstated assumptions, and insufficient evidence
- Score all 8 dimensions (1-10 scale)
- Follow the exact output format from the prompt file
- Write entirely in Spanish

Save your review to: `generated/reports/drs/reviews/analyst/<SECTION>.md`

### Pass 3: Adversary (Devil's Advocate)

Read the reviewer instructions at `lib/components/drs/prompts/adversary.md`.

You are now the Adversary — the toughest committee member. Your job is to stress-test arguments, expose blind spots, and anticipate the hardest questions. Your guiding question: "Where does this argument break, and what uncomfortable questions should the author answer?"

- Identify at least 5 points of vulnerability
- Formulate the defense questions a committee would ask
- Find counterarguments the author hasn't considered
- Detect strategic vagueness or hedging that masks weaknesses
- Score all 8 dimensions (1-10 scale)
- Follow the exact output format from the prompt file
- Write entirely in Spanish

Save your review to: `generated/reports/drs/reviews/adversary/<SECTION>.md`

### Pass 4: Synthesis

Read the synthesis instructions at `lib/components/drs/prompts/synthesizer.md`.

Now read back the three reviews you just produced. As the committee moderator, synthesize them into a unified report:

- Identify unanimous findings (3/3 agree)
- Identify majority findings (2/3 agree)
- Identify divergences (where reviewers disagree) — these are often the most revealing
- Produce a consolidated scores table
- Create a prioritized action plan (critical → major → minor)
- List the top 10 anticipated defense questions
- Assess defense readiness

Save the synthesis to: `generated/reports/drs/synthesis/<SECTION>.md`

### Output Checklist

Confirm these 4 files were created:
- [ ] `generated/reports/drs/reviews/advocate/<SECTION>.md`
- [ ] `generated/reports/drs/reviews/analyst/<SECTION>.md`
- [ ] `generated/reports/drs/reviews/adversary/<SECTION>.md`
- [ ] `generated/reports/drs/synthesis/<SECTION>.md`
```

---

## Available Sections

| Section ID | Name | ~Words |
| ---------- | ---- | ------ |
| `1-introduccion` | Introduccion | 7,465 |
| `2-metodologia` | Metodologia | 5,579 |
| `3-fundamentos-1` | Fundamentos Teoricos I | 17,725 |
| `4-fundamentos-2` | Fundamentos Teoricos II | 9,934 |
| `5-marco-resistencia` | Marco de Resistencia | 16,938 |
| `6-discusion` | Discusion | 14,523 |
| `7-conclusiones` | Conclusiones | 4,050 |

---

## Full Thesis Review Prompt

For reviewing all sections sequentially, use this variant:

```
I need you to run a Triple-Lens Peer Review (TLR) across all thesis sections.

Follow the TLR system defined in `lib/components/drs/prompts/`. Read `dimensions.md` and `global.md` first as shared context.

Process each of these sections in order:
1. 1-introduccion
2. 2-metodologia
3. 3-fundamentos-1
4. 4-fundamentos-2
5. 5-marco-resistencia
6. 6-discusion
7. 7-conclusiones

For each section:
1. Read the section content from `generated/markdown/<section>.md`
2. Run three independent review passes using the prompts in `lib/components/drs/prompts/` (advocate.md, analyst.md, adversary.md)
3. Synthesize the three reviews using `lib/components/drs/prompts/synthesizer.md`
4. Save individual reviews to `generated/reports/drs/reviews/<reviewer>/<section>.md`
5. Save synthesis to `generated/reports/drs/synthesis/<section>.md`

All output must be in Spanish. Follow the exact output formats specified in each reviewer prompt. Score all 8 evaluation dimensions on a 1-10 scale.

3-fundamentos-1, 5-marco-resistencia, and 6-discusion are 15K-18K words: instad of truncating the content, process each in two halves and merge the reviews.

After all sections are reviewed, produce a final global synthesis at `generated/reports/drs/synthesis/global.md` that evaluates cross-section coherence, the overall narrative arc, and defense readiness for the thesis as a whole.
```

---

## Tips

- **Long sections** (fundamentos-1, marco-resistencia, discusion): These are 15K-18K words. If the agent truncates content, ask it to process in two halves and merge the reviews.
- **Most value**: The synthesis divergence map — where reviewers disagree reveals the most about the text.
- **Iteration**: After making revisions, re-run the TLR on the revised section and compare scores.
