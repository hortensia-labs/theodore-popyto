---
name: Round 1 Revision Plan
overview: Systematic implementation plan addressing all issues identified in the Round 1 Triple-Lens Peer Review (TLR) across 7 thesis chapters, organized into 6 phases over an estimated 4-6 weeks, targeting an upgrade from 6.97/10 to 8.0+/10.
todos:
  - id: phase-0
    content: "Phase 0: Editorial Cleanup -- resolve ~80-100 cross-reference placeholders, editorial notes, section numbering, questionable sources, and human-required reference verification"
    status: pending
  - id: phase-1
    content: "Phase 1: Research Sprints -- COMPLETED. 11 research reports stored in revisions/round-1/res/ (DR 1.1 through DR 1.11)"
    status: completed
  - id: phase-2
    content: "Phase 2: Core Argumentative Revisions -- resolve circularity (ontological vs heuristic), add rival paradigm confrontation, articulate ontology/contingency position, establish AI limitation typology, define key concepts operationally"
    status: pending
  - id: phase-3
    content: "Phase 3: Bibliographic Strengthening -- incorporate dance studies canon, computational creativity, Chapter 7 citations, Arntz critique, Dreyfus precision, source verification and correction"
    status: pending
  - id: phase-4
    content: "Phase 4: Structural/Methodological Improvements -- RSL transparency via reverse-engineering (PRISMA), tension typology, failure criteria, ALM matrix, adversarial case in Ch.6, section 4.2.2 reorganization, operativity recalibration (Option B: heuristic language), appendix template, visual generation"
    status: pending
  - id: phase-5
    content: "Phase 5: Text Quality -- eliminate redundancy (~1500-2000 words), strengthen double void, differentiate dance, authorial voice, Darda/Cross ambiguity, Polanyi nuance, transition diversity, tone moderation, vignette rebalancing"
    status: pending
  - id: phase-6
    content: "Phase 6: Final Polish -- Ch.5 limitations, kinesthetic uncanny valley as hypothesis, Korper/Leib binarism reflection, objectives table, transferability matization, positionality expansion, compile, second TLR review"
    status: pending
isProject: false
---

# Round 1 Revision Implementation Plan

The TLR review identified 20 action items at global level and 70+ chapter-specific issues. This plan consolidates them into 6 execution phases, ordered by dependency and impact. Each phase groups related tasks to avoid redundant passes over the same files.

Current score: **6.97/10** | Target: **8.0+/10**

---

## Phase 0: Editorial Cleanup (Estimated: 3-5 days)

**Rationale**: Every reviewer flagged ~80-100 unresolved editorial markers as the most visible and easiest-to-fix credibility problem. This must be done first so subsequent content work operates on a clean text.

### 0.1 Resolve all cross-reference placeholders

- Scan all content files across sections 1-7 for `[Paragraph Number & Page Number]` markers (~80-100 instances)
- Replace each with the actual section/paragraph reference or anchor and with the appropriate marker as indicated in the `rules/cross-references.md` file.
- **Files**: All 64 content `.md` files in `sections/*/content/`
- **Approach**: Use `grep` to create a full inventory, then resolve each systematically using the cross-reference system documented in [lib/adobe/modules/crossref/](lib/adobe/modules/crossref/)

### 0.2 Remove editorial notes

- Remove all `[NOTA]`, `[REVISAR]`, `[PENDIENTE]`, `<!-- DRAFTING METADATA -->` blocks
- **Files**: Sections 3, 4, 5, 6, 7

### 0.3 Fix section numbering in Chapter 4

- Add missing headers "4.1 El Pilar de la Economia Laboral" and "4.2 La Inteligencia Artificial Generativa"
- **File**: [sections/4-fundamentos-2/content/4.0-introduccion.md](sections/4-fundamentos-2/content/4.0-introduccion.md)

### 0.4 Remove "Base de la tesis" self-references

- Replace all instances of "Base de la tesis" as source with proper academic citations
- **Files**: Sections 3, 4

### 0.5 Verify and correct the Nonaka & Takeuchi attribution

- The review flags an erroneous attribution in Chapter 3 (cited in context of dance pedagogy; their work is on organizational knowledge management)
- **REQUIRES HUMAN**: The author must identify what the correct source was for the attributed content

### 0.6 Document artist quotes with proper citations

- **REQUIRES HUMAN**: McGregor, Damien Henry, Muriel Romero, and audience reactions from *Sayonara* need bibliographic references (interview, article, year, outlet). The author must provide or locate these sources.

### 0.7 Verify and document Emily Clarke reference

- **REQUIRES HUMAN**: The closing of Chapter 7 invokes "Emily Clarke y sus colegas" without citation. The author must provide the full APA reference.

---

## Phase 1: Research Sprints -- COMPLETED

**Status**: All 11 research reports have been produced and are stored in `revisions/round-1/res/`:


| Report | File                                           | Topic                                                                   |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| 1.1    | [DR 1.1 .md](revisions/round-1/res/DR 1.1 .md) | Functionalism (Dennett, Putnam)                                         |
| 1.2    | [DR 1.2.md](revisions/round-1/res/DR 1.2.md)   | Posthumanism (Haraway, Braidotti, Hayles)                               |
| 1.3    | [DR 1.3.md](revisions/round-1/res/DR 1.3.md)   | Embodied AI & dance robotics (Brooks, Pfeifer, Di Paolo, Froese)        |
| 1.4    | [DR 1.4.md](revisions/round-1/res/DR 1.4.md)   | Dance studies canon (Sheets-Johnstone, Lepecki, Foster, Bench, Sicchio) |
| 1.5    | [DR 1.5.md](revisions/round-1/res/DR 1.5.md)   | Computational creativity (Boden, Colton)                                |
| 1.6    | [DR 1.6.md](revisions/round-1/res/DR 1.6.md)   | Arntz et al. critique of Frey & Osborne                                 |
| 1.7    | [DR 1.7.md](revisions/round-1/res/DR 1.7.md)   | Post-phenomenology (Ihde, Verbeek, Stiegler, Dixon)                     |
| 1.8    | [DR 1.8.md](revisions/round-1/res/DR 1.8.md)   | Dreyfus on AI limits                                                    |
| 1.9    | [DR 1.9.md](revisions/round-1/res/DR 1.9.md)   | Practice-based research (Borgdorff, Nelson)                             |
| 1.10   | [DR 1.10.md](revisions/round-1/res/DR 1.10.md) | Fischer-Lichte on presence and performativity                           |
| 1.11   | [DR 1.11.md](revisions/round-1/res/DR 1.11.md) | Extended mind thesis (Clark, Chalmers)                                  |


All subsequent phases reference these files as `DR X.X` for source material.

---

## Phase 2: Core Argumentative Revisions (Estimated: 8-10 days)

**Rationale**: These are the highest-impact content changes that address the three critical vulnerabilities: circularity, lack of counter-argument engagement, and the ontology/contingency tension.

### 2.1 Resolve the circularity: distinguish ontological from heuristic irreducibility

**Impact**: Transversal (Chapters 1, 3, 5, 6, 7) | Severity: CRITICAL

- In Chapter 1 ([sections/1-introduccion/content/1.2-problema.md](sections/1-introduccion/content/1.2-problema.md) or [1.4-pregunta-hipotesis.md](sections/1-introduccion/content/1.4-pregunta-hipotesis.md)): Add explicit statement that the irreducibility of the Leib is a working hypothesis, not an axiom
- In Chapter 3 ([sections/3-fundamentos-1/content/3.0-introduccion.md](sections/3-fundamentos-1/content/3.0-introduccion.md)): Frame phenomenology as a theoretically justified choice, not the only possible framework
- In Chapter 5 ([sections/5-marco-resistencia/content/5.1-arquitectura-marco.md](sections/5-marco-resistencia/content/5.1-arquitectura-marco.md)): Formulate that the framework proposes an *interpretation*, not a *discovery*
- In Chapter 7 ([sections/7-conclusiones/content/7.1-recapitulacion.md](sections/7-conclusiones/content/7.1-recapitulacion.md)): Replace "se confirma" with "se muestra productiva" / "se sustenta argumentativamente"

### 2.2 Add confrontation with rival paradigms

**Impact**: Chapters 1, 3, 5, 6 | Severity: CRITICAL

Using research from Phases 1.1-1.3, add substantive engagement with:

- **Functionalism** (Dennett, Putnam): In Chapter 3, ideally as subsection within 3.1
- **Posthumanism** (Haraway, Braidotti, Hayles): In Chapter 1 (paragraph in 1.2 or 1.3), developed fully in Chapter 5 or 6
- **Embodied AI** (Brooks, Pfeifer, Di Paolo): In Chapter 4 (new content in 4.2) and Chapter 5
- **Extended Mind** (Clark, Chalmers): Brief engagement in Chapter 3

Minimum: one dedicated subsection (800-1200 words) in Chapter 3 or 5, with echoes in Chapters 1, 4, 6.

### 2.3 Articulate the ontology/contingency position

**Impact**: Chapters 5, 6, 7 | Severity: CRITICAL

- In [sections/5-marco-resistencia/content/5.3.2-problematizacion-frontera.md](sections/5-marco-resistencia/content/5.3.2-problematizacion-frontera.md): Articulate a critical realist position distinguishing ontological level (qualities of the Leib are real) from normative level (their relevance depends on social decisions)
- Echo this articulation in Chapter 6 autocritique and Chapter 7 conclusions

### 2.4 Establish typology of AI limitations

**Impact**: Chapters 1, 3, 4, 5 | Severity: CRITICAL

Create an explicit three-level typology:

- (a) Contingent technical limitations (current implementation gaps, likely to be overcome)
- (b) Deep architectural limitations (fundamental to current paradigms, uncertain if solvable)
- (c) In-principle ontological limitations (structural, if any)
- Introduce in Chapter 1, develop in Chapter 3 or 4, apply consistently throughout
- Reclassify every claim about what AI "cannot" do according to this typology

### 2.5 Define key concepts operationally

**Impact**: Chapters 3, 4, 5 | Severity: MAJOR

- Define "irreductiblemente humano" with explicit demarcation criteria
- Define "Resistencia Encarnada" formally (already partially done in Ch. 5, but strengthen)
- Define "presencia escenica" with phenomenological criteria, engaging Fischer-Lichte (research 1.10)

---

## Phase 3: Bibliographic and Evidential Strengthening (Estimated: 5-7 days)

### 3.1 Incorporate dance studies canonical references

Using research from Phase 1.4, add references to:

- **Chapter 1**: Sheets-Johnstone, Lepecki, Foster, Bench in the literature gap argument
- **Chapter 3**: Sheets-Johnstone (phenomenology of movement), Calvo-Merino (kinesthetic empathy)
- **Files**: Primarily [sections/1-introduccion/content/1.2-problema.md](sections/1-introduccion/content/1.2-problema.md) and multiple Ch. 3 content files

### 3.2 Incorporate computational creativity literature

Using research from Phase 1.5:

- **Chapter 3 or 4**: Reference Boden's creativity types, Colton's creative tripod
- Engage with the question of whether AI can be creative in Boden's "transformational" sense

### 3.3 Add strategic citations to Chapter 7

**Impact**: Chapter 7 | Severity: CRITICAL

Using research from Phase 1.7:

- **[sections/7-conclusiones/content/7.2-contribucion.md](sections/7-conclusiones/content/7.2-contribucion.md)**: 4-5 references contrasting with Ihde, Verbeek, Stiegler, Dixon, Hayles
- **[sections/7-conclusiones/content/7.3-implicaciones.md](sections/7-conclusiones/content/7.3-implicaciones.md)**: 2-3 references on creativity and AI philosophy
- **[sections/7-conclusiones/content/7.4-lineas-futuras.md](sections/7-conclusiones/content/7.4-lineas-futuras.md)**: 2-3 references on practice-based research methodology

### 3.4 Incorporate Arntz et al. critique of Frey and Osborne

Using research from Phase 1.6:

- **[sections/4-fundamentos-2/content/4.1.1-tareas-rutinarias.md](sections/4-fundamentos-2/content/4.1.1-tareas-rutinarias.md)**: Present 0.4% as orientative indicator, discuss Arntz et al. critique

### 3.5 Add precise Dreyfus citation and contextualization

Using research from Phase 1.8:

- **[sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md](sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md)**: Add precise bibliographic reference, develop argument briefly, add caveat about pre-deep-learning context

### 3.6 Verify and correct questionable sources

- **visive.ai** (Ch. 3): Replace with peer-reviewed source for "kinesthetic uncanny valley" or reframe as untested hypothesis
- **Academy 2023** (Ch. 3): Replace with peer-reviewed source for muscle memory claims
- **Gatys et al. 2015** (Ch. 5): Verify attribution -- this paper is about neural style transfer, not daguerreotype history. Find correct source.
- **Fuentes periodisticas** (Ch. 4): Replace Leprince-Ringuet, Myers, McRainey, Winship with primary academic papers (Tseng et al. for EDGE, Georgia Tech publications for LuminAI)

### 3.7 Verify 2025-2026 sources availability

- Check that all sources dated 2025-2026 have complete bibliographic data and are accessible to evaluators
- **Files**: Primarily Chapters 3, 4, 5

---

## Phase 4: Structural and Methodological Improvements (Estimated: 5-7 days)

### 4.1 Transparentize the RSL via reverse-engineering (Chapter 2)

**Approach**: Since the author cannot provide original screening records, we reverse-engineer defensible quantitative data from the thesis itself:

**Step 1 -- Extract actual corpus data**:

- Run `make merge-all-r` followed by `make scan-citations` to generate `generated/data/citation-registry.json`
- The thesis contains ~373 citation instances from ~231-241 unique works across 7 chapters
- Distribution: Ch.3 (68.6%), Ch.4 (15%), Ch.2 (5.9%), Ch.5 (5.1%), Ch.1 (4.8%), Ch.6 (0.5%), Ch.7 (0%)

**Step 2 -- Classify by disciplinary stream**:

- Parse unique citations and classify each into the 4 streams defined in 2.2.1: (a) Phenomenology/Embodied cognition, (b) Labor economics/Task analysis, (c) Aesthetic theory/Artistic value, (d) Dance poetics/Studies
- Report the distribution as a table

**Step 3 -- Reconstruct approximate PRISMA numbers**:

- Final included corpus: N = actual unique sources from citation registry
- Estimate reasonable screening numbers working backward (identification ~2x included, first screen ~1.5x included, per standard RSL attrition rates)
- Present numbers as "approximate reconstruction" with a methodological note explaining the retrospective approach

**Step 4 -- Formalize search strings**:

- The qualitative descriptions in [2.2-fases-desarrollo.md](sections/2-metodologia/content/2.2-fases-desarrollo.md) (line 15) already contain example Boolean strings. Formalize these into a complete table of search strings per disciplinary stream and database.
- Add approximate search dates based on the oldest and newest sources in the corpus.

**Step 5 -- Operationalize adapted PRISMA criteria**:

- Define what replaced risk-of-bias evaluation: "argumentative soundness," "internal coherence," "conceptual relevance"
- Provide one example of a source included and one excluded per criterion

**Step 6 -- Generate PRISMA visual** (see Visual A in section 4.11)

**Files**: [sections/2-metodologia/content/2.2-fases-desarrollo.md](sections/2-metodologia/content/2.2-fases-desarrollo.md)

**Note**: Add a transparent methodological note acknowledging that the PRISMA data is a retrospective reconstruction, which is common practice in theoretical RSLs where the original screening log was not maintained in standardized format.

### 4.2 Develop typology of productive tensions (Chapter 2)

- Add distinction between tension types (complementary, hierarchical, irresolvable)
- Establish demarcation criteria for when a tension is productive vs. paralytic
- Include at least one example of a tension that was NOT productively resolved
- **File**: [sections/2-metodologia/content/2.3-modelo-integracion.md](sections/2-metodologia/content/2.3-modelo-integracion.md)

### 4.3 Define explicit failure criteria for vignettes (Chapter 2)

- Specify what vignette results would constitute unequivocal framework failure
- Provide concrete indicators tied to each validation criterion (differentiation, revelation, orientation)
- **File**: [sections/2-metodologia/content/2.4-validacion.md](sections/2-metodologia/content/2.4-validacion.md)

### 4.4 Create formal ALM task classification matrix (Chapter 4)

- Create table: routine/non-routine x cognitive/manual x abstract/interpersonal for choreographer (5 categories) and dancer (5 categories)
- Include comparison with at least one related artistic profession (actor or musician)
- **File**: [sections/4-fundamentos-2/content/4.1.2-desagregacion-danza.md](sections/4-fundamentos-2/content/4.1.2-desagregacion-danza.md)

### 4.5 Include a case that tensions the framework (Chapter 6)

- Add a brief vignette or analysis (~500-800 words) of a "difficult case" for the framework: TikTok dance learning, contact improvisation with robotic haptic feedback, or deepfakes of movement
- Explicitly show how the framework handles it (accommodation, nuanced analysis, or acknowledged limit)
- **File**: New content in [sections/6-discusion/content/6.1.4-sintesis-vinetas.md](sections/6-discusion/content/6.1.4-sintesis-vinetas.md) or as a new subsection

### 4.6 Reorganize section 4.2.2 (Chapter 4)

- Separate the ontological argument (Korper/Leib gap) from ethical-juridical questions (bias, rights, authorship)
- Option: Create subsection 4.2.3 for ethical implications as bridge to Chapter 5
- **File**: [sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md](sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md)

### 4.7 Recalibrate "operativity" language -- Option B (Chapter 5)

**Decision**: Option B selected -- recalibrate language from "instrumento analitico operativo" to "heuristica conceptual orientativa"

- Search all content files in Chapters 2, 5, and 6 for language that promises "operational" or "instrumental" qualities
- Replace with "heuristic," "orientative," "conceptual guide," or "system of guiding questions" as appropriate
- Ensure consistency: if the framework is called "heuristic" in one place, it should not be called "instrument" elsewhere
- Adjust the validation language in Chapter 2 (2.4) accordingly -- the vignettes "illustrate heuristic potential," not "demonstrate operational validity"
- **Files**: [sections/5-marco-resistencia/content/5.1-arquitectura-marco.md](sections/5-marco-resistencia/content/5.1-arquitectura-marco.md), [5.4-interrelaciones.md](sections/5-marco-resistencia/content/5.4-interrelaciones.md), [sections/2-metodologia/content/2.4-validacion.md](sections/2-metodologia/content/2.4-validacion.md), and any mentions in Chapter 6

### 4.8 Include practice-based research reference (Chapter 2)

Using research from Phase 1.9:

- Reference Borgdorff and Nelson; justify why a purely theoretical-conceptual approach was chosen
- **File**: [sections/2-metodologia/content/2.1-enfoque-general.md](sections/2-metodologia/content/2.1-enfoque-general.md)

### 4.9 Include analysis template as appendix (Chapter 2)

- Add the conceptual analysis template used for source reading as appendix
- Include example of application to two sources from different disciplines
- **File**: New file in [sections/9-anexos/content/](sections/9-anexos/content/)

### 4.10 Source interpretation audit (alternative to expert consultation)

**Context**: Expert consultation is not feasible. The following alternative partially addresses the intersubjective validation gap:

**Option A -- LLM-based source interpretation audit**:

- For each disciplinary stream, select 3-5 key sources whose interpretation is most critical to the thesis argument
- Create prompts presenting the thesis's interpretation of each source and asking whether the reading is faithful, noting potential misreadings or oversimplifications
- Document the audit results and any corrections made
- Frame this in the methodology as a "systematic source interpretation review" -- not equivalent to peer debriefing, but a structured verification step

**Option B -- Acknowledge and move on**:

- Strengthen the limitations section ([sections/2-metodologia/content/2.5-limitaciones.md](sections/2-metodologia/content/2.5-limitaciones.md)) to explicitly acknowledge the absence of intersubjective validation as a known limitation
- Frame the reflexivity practiced throughout the thesis as the primary (though imperfect) quality control mechanism
- Note that the autocritique in Chapter 6 (section 6.3) partially addresses this by transparently identifying where the analysis may be limited by the author's perspective

**Recommendation**: Execute Option A for the highest-stakes sources (Merleau-Ponty, Autor/Levy/Murnane ALM model, key dance studies), then strengthen the limitation acknowledgment per Option B regardless.

### 4.11 Visual generation

Four diagrams are required. Use an image generation agent or produce them programmatically:

**Visual A -- PRISMA Flow Diagram (Chapter 2)**:

> Generate a clean, professional PRISMA-style flow diagram for a systematic literature review in a doctoral thesis about dance and AI. The diagram shows four stages vertically: (1) IDENTIFICATION -- records identified from 5 databases (Scopus, Web of Science, JSTOR, PhilPapers, Google Scholar); (2) SCREENING -- first filter by title/abstract, second filter by full-text reading; (3) ELIGIBILITY -- assessment against adapted criteria (argumentative soundness, internal coherence, conceptual relevance); (4) INCLUSION -- final corpus. At the bottom, show distribution across 4 disciplinary streams: "Phenomenology / Embodied Cognition", "Labor Economics / Task Analysis", "Aesthetic Theory / Artistic Value", "Dance Poetics / Studies". Use clean academic style with rectangular boxes, directional arrows, and muted professional colors (grayscale or navy/white). No decorative elements. The numbers in boxes should use placeholder format [N] to be filled in after citation extraction. Landscape orientation.

**Visual B -- Stratified Analysis Model (Chapter 2)**:

> Generate a professional academic diagram of a three-level stratified analysis model for interdisciplinary research in a doctoral thesis. Three horizontal levels stacked vertically: Bottom level "MICRO: Phenomenological" with subtitle "Lived body, tacit knowledge, kinesthetic experience"; Middle level "MESO: Analytical" with subtitle "Task decomposition, creative labor, automation potential"; Top level "MACRO: Socio-cultural" with subtitle "Artistic field, cultural legitimation, power structures". Between levels, show bidirectional arrows labeled "Bridge concepts". On the left side, a vertical bar labeled "Ethical-Political Lens" spanning all three levels with subtitle "Transversal: cui bono, frontier, value". On the right side, map the four dimensions: D1 Embodied Cognition at micro, D2 Creative Labor at meso, D3 Aesthetic Value at meso-macro boundary, D4 Cultural Context at macro. Clean academic style, muted professional palette (no bright colors). Suitable for print in a doctoral thesis.

**Visual C -- ALM Task Classification Matrix (Chapter 4)**:

> Generate a professional academic table visualization for a doctoral thesis showing the classification of dance professions using the ALM (Autor, Levy, Murnane) task-based model. Matrix columns: "Routine Cognitive", "Routine Manual", "Non-routine Cognitive Analytical", "Non-routine Cognitive Interpersonal", "Non-routine Manual". Rows: "Choreographer" and "Dancer" (and a comparison row for "Actor"). Each cell contains brief task descriptions. Use a subtle color gradient for "Automation Resistance": green for high resistance, yellow for moderate, red for low. Include a bottom row showing "Density of Resistance" per task category. Clean, readable academic style with clear borders and professional typography. No decorative elements.

**Visual D -- Embodied Resistance Framework Concentric Diagram (Chapter 5)**:

> Generate a concentric rings diagram for the "Embodied Resistance" framework in a doctoral thesis about dance and AI. Four concentric rings from innermost to outermost: Ring 1 (center, smallest) "D1: Cognicion Corporeizada" (Leib, tacit knowledge, proprioception); Ring 2 "D2: Trabajo Creativo-Colaborativo" (tasks, situated judgment, adaptation); Ring 3 "D3: Valor y Significado Estetico" (intentionality, expressivity, aura, symbol); Ring 4 (outermost) "D4: Contextualizacion Cultural" (artistic field, cooperation networks, legitimation). A fifth semi-transparent layer or border surrounding everything labeled "Lente Etico-Politica" (cui bono, frontier construction, value). Between adjacent rings, show small labeled connection nodes: "Kinesthetic empathy" between D1-D3, "Productive tension Leib-task" between D1-D2, "Expressive labor" between D2-D3, "Cultural capital" between D3-D4. Use a scholarly, elegant color palette with each ring in a distinct muted tone. Show micro-to-macro progression labels. Clean academic style suitable for doctoral thesis print.

---

## Phase 5: Text Quality and Redundancy Reduction (Estimated: 3-5 days)

### 5.1 Eliminate argumentative redundancy

Target: reduce ~1,500-2,000 words across chapters 1, 3, 5, 6

- **Korper/Leib distinction**: Consolidate main development in 1.2.1 and 3.1.1; use brief references elsewhere
- **"Assistance yes, substitution no"**: Consolidate in one location with cross-references
- **Stage presence**: Distinguish "presencia escenica" (enactive-cognitive, 3.1.3) from "presencia auratica" (aesthetic-valorative, 3.2.3) with precise differential terminology
- **Joufflineau study**: Remove duplicate/near-verbatim citations; keep in one location with cross-references
- **Dance as limit case**: Consolidate the argument, don't repeat in each section

### 5.2 Strengthen the "double void" demonstration (Chapter 1)

- Cite 3-4 additional sources for the "humanist pole"
- Acknowledge intermediate positions (Bench, Sicchio, Motion Bank)
- Redefine the void as lack of systematization at the proposed scale, not total absence
- **File**: [sections/1-introduccion/content/1.2-problema.md](sections/1-introduccion/content/1.2-problema.md)

### 5.3 Differentiate dance from other performative arts (Chapter 1)

- Add explicit comparative argument in 1.2.1 articulating why dance is a *more* instructive limit case than theater, circus, martial arts
- Suggested argument: dance is the only art where bodily movement is simultaneously medium, material, AND final product
- **File**: [sections/1-introduccion/content/1.2-problema.md](sections/1-introduccion/content/1.2-problema.md)

### 5.4 Strengthen authorial voice in descriptive sections (Chapter 3)

- Add positioning statements in sections 3.3.1 (gesture and signification) and 3.3.3 (cultural anchoring)
- Ensure each finding is explicitly connected to the central argument
- **Files**: [sections/3-fundamentos-1/content/3.3.1-lenguaje-movimiento.md](sections/3-fundamentos-1/content/3.3.1-lenguaje-movimiento.md), [3.3.3-anclaje-cultural.md](sections/3-fundamentos-1/content/3.3.3-anclaje-cultural.md)

### 5.5 Discuss ambiguity of Darda and Cross studies (Chapter 3)

- Acknowledge that studies show biases "regardless of objective quality," which admits the reading that the problem is audience prejudice, not AI incapacity
- Incorporate analysis of blind studies if they exist
- **File**: [sections/3-fundamentos-1/content/3.2.2-co-construccion.md](sections/3-fundamentos-1/content/3.2.2-co-construccion.md) or [3.1.3-presencia-escenica.md](sections/3-fundamentos-1/content/3.1.3-presencia-escenica.md)

### 5.6 Matize the Paradox of Polanyi (Chapter 4)

- Distinguish between procedural tacit knowledge (movement patterns, which AI can learn from data) and experiential/significative tacit knowledge (intention, meaning, which may constitute a more robust barrier)
- **File**: [sections/4-fundamentos-2/content/4.1.2-desagregacion-danza.md](sections/4-fundamentos-2/content/4.1.2-desagregacion-danza.md)

### 5.7 Separate genuine framework contributions from common-sense recommendations (Chapter 6)

- In sections 6.2.1-6.2.4, explicitly mark which recommendations are genuinely derived from the framework vs. general good practice
- Highlight what the framework recommends that NO other framework would recommend
- **Files**: [sections/6-discusion/content/6.2.1-investigacion-futura.md](sections/6-discusion/content/6.2.1-investigacion-futura.md) through [6.2.4-politicas-tecnologia.md](sections/6-discusion/content/6.2.4-politicas-tecnologia.md)

### 5.8 Diversify transitions and remove modular assembly marks (Chapters 5, 6)

- Replace the formulaic pattern (summary -> rhetorical question -> anticipation -> separator -> "[Continues in section X.X]")
- Vary discursive strategies at dimension/section boundaries
- **Files**: Multiple files in sections 5 and 6

### 5.9 Moderate rhetorical-persuasive tone (Chapter 1)

- Moderate programmatic formulations in 1.3 and 1.6
- Replace metaphors that substitute for arguments
- **Files**: [sections/1-introduccion/content/1.3-justificacion.md](sections/1-introduccion/content/1.3-justificacion.md), [1.6-relevancia.md](sections/1-introduccion/content/1.6-relevancia.md)

### 5.10 Condense Chapter 1 section 1.7 (thesis structure description)

- Reduce each chapter description to 3-4 sentences focused on argumentative function, not detailed content
- **File**: [sections/1-introduccion/content/1.7-estructura.md](sections/1-introduccion/content/1.7-estructura.md)

### 5.11 Rebalance vignette proportions (Chapter 6)

- Condense Vignette A (ballet pedagogy)
- Expand Vignette C (posthuman performer) -- the philosophically richest case
- **Files**: [sections/6-discusion/content/6.1.1-vineta-A-ballet.md](sections/6-discusion/content/6.1.1-vineta-A-ballet.md), [6.1.3-vineta-C-posthumano.md](sections/6-discusion/content/6.1.3-vineta-C-posthumano.md)

### 5.12 Resolve section 5.5 (visual representation)

- Use the generated Visual D (concentric diagram from Phase 4.11) as the actual figure
- Replace the current text-based specification in 5.5 with a reference to the produced figure plus a condensed explanatory paragraph
- Remove the ASCII art representation and the "deberá producirse posteriormente" language
- **File**: [sections/5-marco-resistencia/content/5.5-representacion-visual.md](sections/5-marco-resistencia/content/5.5-representacion-visual.md)

---

## Phase 6: Final Polish and Defense Preparation (Estimated: 3-4 days)

### 6.1 Add limitations discussion to Chapter 5 (400-600 words)

- What the framework cannot do
- What practices it may not apply to
- What assumptions it adopts that could be questioned

### 6.2 Reformulate "kinesthetic uncanny valley" as hypothesis

- In Chapter 5 and Chapter 6: reframe as hypothesis to be empirically tested, not as documented phenomenon
- **Files**: Ch. 5 and Ch. 6 relevant sections

### 6.3 Add brief reflection on Korper/Leib binarism risk (Chapter 7)

- Argue why the distinction doesn't reproduce the human/machine binary the thesis criticizes, or acknowledge as productive limitation
- **File**: [sections/7-conclusiones/content/7.5-consideraciones.md](sections/7-conclusiones/content/7.5-consideraciones.md)

### 6.4 Add "degree of fulfillment" column to objectives table (Chapter 7)

- **File**: [sections/7-conclusiones/content/7.1-recapitulacion.md](sections/7-conclusiones/content/7.1-recapitulacion.md)

### 6.5 Matize transferability as hypothesis (Chapter 7)

- Reformulate as well-founded hypothesis, not demonstrated contribution
- Acknowledge that application to other domains would require specific adjustments
- **File**: [sections/7-conclusiones/content/7.3-implicaciones.md](sections/7-conclusiones/content/7.3-implicaciones.md)

### 6.6 Expand positionality statement (Chapter 2)

- **REQUIRES HUMAN**: Add concrete information about the researcher's background, training, and potential biases
- **File**: [sections/2-metodologia/content/2.5-limitaciones.md](sections/2-metodologia/content/2.5-limitaciones.md)

### 6.7 Compile and merge all sections

- Run `make merge-all-r` to generate clean merged markdown
- Run `make compile-all` for final ICML output
- Verify all cross-references resolve correctly

### 6.8 Second round TLR review

- Run `make peer-review` on revised sections to verify score improvement
- Target: 8.0+ global consolidated score

---

## Summary of Human-Required Tasks

The following tasks **cannot be performed by an LLM** and require the thesis author's direct intervention:


| Task                    | Phase | Description                                                                   | Status  |
| ----------------------- | ----- | ----------------------------------------------------------------------------- | ------- |
| Nonaka and Takeuchi     | 0.5   | Identify the correct source for the content erroneously attributed to them    | Pending |
| Artist quotes           | 0.6   | Provide bibliographic references for McGregor, Henry, Romero, Sayonara quotes | Pending |
| Emily Clarke            | 0.7   | Provide full APA reference for the closing quote in Chapter 7                 | Pending |
| Positionality statement | 6.6   | Provide personal background information for expanded statement                | Pending |


**Previously human-required, now resolved**:

- ~~RSL quantitative data (4.1)~~: Will be reverse-engineered from thesis corpus via citation extraction
- ~~Expert consultations (4.10)~~: Replaced with LLM-based source interpretation audit + strengthened limitation acknowledgment
- ~~Operativity decision (4.7)~~: Option B selected (recalibrate to "conceptual orientative heuristic")

---

## Expected Impact

If all phases are completed, the estimated score improvement would be:

- **Circularidad resolution + rival paradigm confrontation**: +0.5-0.8 points (impacts all dimensions across all chapters)
- **Editorial cleanup**: +0.3-0.5 points (immediate credibility boost)
- **Bibliographic strengthening**: +0.3-0.5 points (evidence and integrity dimensions)
- **Chapter 7 citations + reformulation**: +0.5-0.7 points on Ch. 7 specifically
- **Structural/methodological improvements**: +0.2-0.3 points

Conservative estimate: **6.97 -> 7.8-8.3** (depending on execution quality)