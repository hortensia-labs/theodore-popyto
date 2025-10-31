# **Complete Agent Design for PhD Dissertation Review System**

## **Agent Architecture Overview**

Here's a comprehensive list of all specialized agents and their Claude Code creation prompts. Each agent has a specific role in the dissertation review pipeline.

## **1. Structure Mapper Agent**

**Purpose**: Maps the entire dissertation structure and creates an index of all content.

```markdown
Create a Python-based agent called "DissertationStructureMapper" that analyzes and maps the structure of a PhD dissertation project.

Requirements:
1. Scan the `sections/` directory in the project root
2. Identify all section folders (e.g., `0-cover-matter/`, `1-introduction/`)
3. For each section folder, map:
   - All files in `content/` directory (main dissertation text)
   - Supporting materials in `research/`, `structure/`, `data/` directories
   - File sizes and last modification dates
4. Create a JSON structure map with:
   - Hierarchical representation of the dissertation
   - File metadata (size, word count, last modified)
   - Section dependencies and ordering
   - Total word count per section and overall
5. Generate a markdown summary report showing:
   - Dissertation outline with all sections
   - Content completion status (based on file presence)
   - Missing expected files
   - Statistical overview (total files, words, sections)

The agent should handle:
- Various markdown file naming conventions
- Missing directories gracefully
- Large file structures efficiently
- UTF-8 encoding for international characters

Output files:
- `dissertation_structure.json` - Complete structure map
- `structure_report.md` - Human-readable summary
- `structure_metrics.json` - Statistical data

Include error handling for permission issues, missing directories, and corrupted files.
```

---

## **2. Context Manager Agent**

**Purpose**: Intelligently manages context window to fit relevant content within token limits.

```markdown
Create a Python agent called "ContextWindowManager" that optimizes context loading for reviewing large dissertation documents within Claude's token limits.

Core Functionality:
1. Implement a smart context loading strategy that:
   - Calculates token counts for all content files
   - Prioritizes content based on relevance to current review task
   - Creates concise summaries of non-critical sections
   - Maintains a context budget (max 16,000 tokens)

2. Build three context loading modes:
   - FOCUSED: Load target section + immediate neighbors (8,000 tokens)
   - COMPREHENSIVE: Load target + cross-references + summaries (12,000 tokens)  
   - FULL_SCAN: Progressive loading with summaries of all sections (16,000 tokens)

3. Implement context assembly algorithm:
    ```python
    def assemble_context(target_section, mode='COMPREHENSIVE'):
       # Priority queue: [(content, tokens, priority_score)]
       # 1. Target content (priority 1.0)
       # 2. Cross-referenced sections (priority 0.8)
       # 3. Previous/next sections (priority 0.6)
       # 4. Method/theory sections (priority 0.7)
       # 5. Other section summaries (priority 0.3)
    ```

4. Create intelligent summarization:
   - Extract key points, arguments, and findings
   - Preserve technical terms and definitions
   - Maintain logical flow connections
   - Keep citations and references

5. Implement cross-reference detection:
   - Scan for "see Section X", "as discussed in Chapter Y"
   - Track figure and table references
   - Identify shared concepts and terminology

Output:
- `context_package.json` - Assembled context with metadata
- `context_map.md` - Visual representation of loaded content
- `token_budget.json` - Token allocation breakdown

The agent should optimize for review quality while staying within token limits.
```

---

## **3. Section Reviewer Agent**

**Purpose**: Performs deep review of individual dissertation sections.

```markdown
Create a comprehensive Python agent called "SectionReviewer" that performs doctoral-level review of individual dissertation sections.

You are an expert dissertation committee member. Build an agent that:

1. **Review Methodology**:
   - Perform multi-pass analysis:
     * First pass: Structure and logical flow
     * Second pass: Academic rigor and methodology
     * Third pass: Writing quality and clarity
     * Fourth pass: Citations and formatting
   
2. **Evaluation Criteria**:
   Implement checks for:
   - Theoretical Framework: Properly situated in literature?
   - Argumentation: Clear thesis, supporting evidence, logical flow?
   - Methodology: Appropriate methods, clear procedures, limitations?
   - Evidence: Sufficient, relevant, properly analyzed?
   - Writing: Clear, concise, appropriate academic tone?
   - Contribution: Novel insights, advances field knowledge?

3. **Issue Detection System**:
    ```python
    class IssueDetector:
       def detect_issues(self, content):
           issues = {
               'critical': [],  # Fundamental flaws
               'major': [],     # Significant problems
               'minor': [],     # Style, grammar, formatting
               'suggestions': [] # Improvements
           }
           # Each issue must include:
           # - location (file:line_number)
           # - description
           # - suggested_fix
           # - impact_assessment
    ```

4. **Generate Detailed Report**:
   Create markdown report with:
   - Executive Summary (150 words)
   - Strengths (bullet points with examples)
   - Critical Issues (if any, with immediate action required)
   - Major Issues (detailed analysis with fixes)
   - Minor Issues (quick fixes list)
   - Writing Quality Assessment
   - Academic Standards Compliance
   - Recommendations for Improvement
   - Connection to Overall Dissertation

5. **Special Checks**:
   - Detect unsupported claims
   - Find logical fallacies
   - Check citation completeness
   - Verify internal consistency
   - Assess figure/table quality and relevance

Input: Section path (e.g., `sections/2-literature-review/`)
Output: `review_[section_name]_[timestamp].md`

The agent should write in a constructive, professional tone appropriate for doctoral committee feedback.
```

---

## **4. Full Dissertation Reviewer Agent**

**Purpose**: Conducts comprehensive review of the entire dissertation.

```markdown
Create an advanced Python agent called "DissertationReviewer" that performs complete doctoral dissertation review.

This agent serves as a senior dissertation committee member conducting a full review. Implement:

1. **Global Analysis Framework**:
    ```python
    class DissertationReviewer:
       def __init__(self):
           self.chapters = []
           self.global_issues = []
           self.coherence_score = 0
           self.contribution_assessment = ""
           
       def review_process(self):
           # Phase 1: Map narrative arc
           # Phase 2: Chapter-by-chapter analysis
           # Phase 3: Cross-chapter coherence
           # Phase 4: Overall assessment
           # Phase 5: Defense readiness
    ```

2. **Comprehensive Evaluation**:
   - Research Question Alignment: Do all chapters serve the central research questions?
   - Theoretical Coherence: Is the theoretical framework consistently applied?
   - Methodological Rigor: Are methods appropriate and properly executed?
   - Evidence Integration: Is evidence properly synthesized across chapters?
   - Contribution Clarity: Is the original contribution clearly articulated?
   - Literature Positioning: Is the work properly situated in the field?

3. **Cross-Chapter Analysis**:
   - Track concept evolution across chapters
   - Verify terminology consistency
   - Check argument building and progression
   - Identify gaps or redundancies
   - Assess transition quality

4. **Generate Comprehensive Report**:
   Structure:
    ```markdown
   # Doctoral Dissertation Review Report
   
   ## Executive Summary (250 words)
   
   ## Overall Assessment
   - Contribution to Field
   - Theoretical Framework
   - Methodological Approach
   - Quality of Analysis
   - Writing and Presentation
   
   ## Chapter-by-Chapter Review
   [Detailed review of each chapter]
   
   ## Cross-Cutting Issues
   [Issues affecting multiple chapters]
   
   ## Strengths
   [Major accomplishments]
   
   ## Required Revisions
   ### Critical (Must fix before defense)
   ### Major (Should fix before defense)
   ### Minor (Can fix after defense)
   
   ## Defense Readiness Assessment
   - [ ] Ready for defense
   - [ ] Ready with minor revisions
   - [ ] Requires major revisions
   - [ ] Not ready for defense
   
   ## Recommended Timeline
   [Revision schedule]
    ```

5. **Quality Metrics**:
   Calculate and report:
   - Coherence score (0-100)
   - Originality score (0-100)
   - Technical rigor score (0-100)
   - Writing quality score (0-100)
   - Defense readiness score (0-100)

The agent should provide specific, actionable feedback with examples and maintain a professional, constructive tone throughout.
```

---

## **5. Cross-Reference Validator Agent**

**Purpose**: Validates all internal references and ensures consistency.

```markdown
Create a Python agent called "CrossReferenceValidator" that validates all internal references in a dissertation.

Requirements:

1. **Reference Detection**:
   Scan all markdown files to detect:
   - Section references: "Chapter 3", "Section 2.4", "see above"
   - Figure references: "Figure 4.2", "Fig. 3"
   - Table references: "Table 2.1"
   - Equation references: "Equation (3.4)"
   - Appendix references: "Appendix A"
   - Footnote references
   - Citation references

2. **Validation Checks**:
    ```python
   class ReferenceValidator:
       def validate(self, reference):
           # Check if referenced item exists
           # Verify reference format consistency
           # Ensure bidirectional linking where appropriate
           # Validate numbering sequences
           # Check for orphaned references
    ```

3. **Consistency Verification**:
   - Ensure uniform reference style (e.g., "Chapter" vs "Ch.")
   - Verify sequential numbering
   - Check that all figures/tables are referenced in text
   - Validate that references point to correct locations

4. **Generate Report**:
   Create `reference_validation_report.md`:
   - Total references found
   - Broken references (with locations)
   - Inconsistent formatting
   - Unreferenced figures/tables
   - Duplicate references
   - Suggested fixes for each issue

5. **Auto-fix Capability**:
   Implement optional auto-fix for:
   - Simple formatting inconsistencies
   - Reference style standardization
   - Sequential numbering corrections
   (Create backup before any modifications)

The agent should handle complex LaTeX-style references and markdown links.
```

---

## **6. Academic Standards Checker Agent**

**Purpose**: Ensures dissertation meets academic and field-specific standards.

```markdown
Create a Python agent called "AcademicStandardsChecker" that verifies dissertation compliance with academic standards.

Implement comprehensive checking for:

1. **Field-Specific Standards**:
   Support multiple fields with customizable rules:
    ```python
    FIELD_STANDARDS = {
       'computer_science': {
           'min_chapters': 5,
           'requires_implementation': True,
           'evaluation_needed': True,
           'algorithm_proofs': True
       },
       'humanities': {
           'min_chapters': 6,
           'primary_sources': True,
           'theoretical_framework': True
       }
       # Add more fields
    }
    ```

2. **Universal Academic Standards**:
   - Abstract requirements (word count, structure)
   - Introduction elements (motivation, objectives, contributions)
   - Literature review comprehensiveness
   - Methodology clarity and reproducibility
   - Results presentation standards
   - Discussion depth requirements
   - Conclusion components
   - Citation format compliance

3. **Writing Standards**:
   - Academic tone and formality
   - Passive vs active voice usage
   - Technical terminology consistency
   - Acronym definitions and usage
   - Paragraph and sentence structure
   - Transition quality

4. **Formatting Requirements**:
   - Chapter/section numbering
   - Figure and table formatting
   - Citation style (APA, MLA, Chicago, IEEE)
   - Bibliography completeness
   - Appendix organization
   - Page layout standards

5. **Generate Compliance Report**:
    ```markdown
    ## Academic Standards Compliance Report
    
    ### Field-Specific Requirements
    - [x] Meets minimum chapter requirement
    - [ ] Contains required methodology section
    - [x] Includes empirical evaluation
    
    ### Writing Standards
    - Academic tone: 92/100
    - Clarity score: 88/100
    - Technical accuracy: 95/100
    
    ### Formatting Compliance
    - Citation style: IEEE (98% consistent)
    - Figure formatting: 12/15 compliant
    
    ### Required Corrections
    [Detailed list with locations]
    ```

The agent should be configurable for different universities and departments.
```

---

## **7. Report Generator Agent**

**Purpose**: Creates professionally formatted review reports.

```markdown
Create a Python agent called "ReportGenerator" that produces professional dissertation review reports in multiple formats.

Features:

1. **Report Templates**:
   Create customizable templates for:
   - Section reviews
   - Chapter reviews  
   - Full dissertation reviews
   - Progress reports
   - Final defense assessment

2. **Report Assembly**:
    ```python
    class ReportBuilder:
        def __init__(self, template_type):
           self.sections = []
           self.metadata = {}
           self.issues = []
           self.recommendations = []
           
        def add_section(self, title, content, priority=0):
           # Add report sections with smart ordering
           
        def compile_report(self, format='markdown'):
           # Assemble final report with TOC
    ```

3. **Multi-format Output**:
   Generate reports in:
   - Markdown (primary)
   - PDF (via pandoc)
   - HTML (with interactive elements)
   - LaTeX (for formal submission)
   - DOCX (for committees requiring Word)

4. **Visual Elements**:
   Include in reports:
   - Progress charts (completion status)
   - Issue severity distribution graphs
   - Readability metrics visualization
   - Chapter interdependency diagrams
   - Timeline for revisions

5. **Smart Formatting**:
   - Auto-generate table of contents
   - Create executive summaries
   - Highlight critical issues
   - Add hyperlinks between sections
   - Include timestamp and version info
   - Generate issue priority matrix

6. **Report Features**:
   - Searchable issue index
   - Actionable recommendation list
   - Revision checklist
   - Progress tracking sections
   - Committee signature blocks

Output files:
- `report_[timestamp].md` - Main report
- `report_[timestamp]_executive.md` - Executive summary
- `report_[timestamp]_issues.csv` - Issue list
- `report_[timestamp]_checklist.md` - Action items

The agent should maintain consistent professional formatting and academic tone.
```

---

## **8. Revision Tracker Agent**

**Purpose**: Tracks changes between dissertation versions and review iterations.

```markdown
Create a Python agent called "RevisionTracker" that monitors dissertation revisions and tracks improvement progress.

Core Functionality:

1. **Version Comparison**:
    ```python
    class RevisionTracker:
        def __init__(self, original_path, revised_path):
            self.original = self.load_version(original_path)
            self.revised = self.load_version(revised_path)
            self.changes = []
            self.resolved_issues = []
            self.new_issues = []
           
        def track_changes(self):
            # Line-by-line comparison
            # Semantic diff for paragraphs
            # Structure changes detection
            # Word count changes
    ```

2. **Issue Resolution Tracking**:
   - Load previous review issues
   - Check which issues have been addressed
   - Verify quality of fixes
   - Identify partially resolved issues
   - Detect new issues introduced

3. **Change Classification**:
   Categorize changes as:
   - Content additions
   - Content deletions
   - Rewording/rephrasing
   - Structural reorganization
   - Reference updates
   - Formatting changes
   - New sections/chapters

4. **Progress Metrics**:
   Calculate and report:
   - Issues resolved: X/Y (Z%)
   - New content added: X words
   - Content removed: Y words
   - Structural improvements: List
   - Remaining critical issues: Count
   - Estimated time to completion

5. **Generate Revision Report**:
    ```markdown
    ## Revision Progress Report
    
    ### Summary
    - Review Date: [Current]
    - Previous Review: [Date]
    - Overall Progress: [Percentage]
    
    ### Resolved Issues
    ✓ Critical Issue #1: [Description] - RESOLVED
    ✓ Major Issue #3: [Description] - RESOLVED
    
    ### Partially Addressed
    ⚠ Major Issue #2: [Description] - 60% complete
    
    ### Outstanding Issues
    ✗ Critical Issue #4: [Description] - NOT ADDRESSED
    
    ### New Changes
    + Added section on [Topic] (500 words)
    ~ Revised methodology description
    - Removed redundant content in Chapter 3
    
    ### Next Steps
    Priority 1: [Action items]
    ```

6. **Smart Diff Visualization**:
   - Show before/after comparisons
   - Highlight significant changes
   - Track citation additions/updates
   - Monitor figure/table changes

The agent should integrate with git for version control and maintain a revision history database.
```

---

## **9. Issue Tracker Agent**

**Purpose**: Manages, categorizes, and prioritizes all identified issues.

```markdown
Create a Python agent called "IssueTracker" that manages all dissertation review issues systematically.

Implementation:

1. **Issue Database**:
    ```python
    class Issue:
        def __init__(self):
            self.id = generate_id()
            self.type = ''  # critical/major/minor/suggestion
            self.category = ''  # theoretical/methodological/writing/formatting
            self.location = ''  # file:line
            self.description = ''
            self.suggested_fix = ''
            self.status = 'open'  # open/in_progress/resolved/wont_fix
            self.priority = 0  # 1-10
            self.effort = ''  # hours estimated
            self.dependencies = []
            self.date_created = now()
            self.date_modified = None
    ```

2. **Issue Management System**:
   - Create new issues from reviews
   - Update issue status
   - Track issue dependencies
   - Calculate resolution order
   - Estimate fix effort
   - Assign priorities automatically

3. **Issue Categorization**:
   Implement smart categorization:
   - Theoretical gaps
   - Methodological flaws
   - Logic errors
   - Evidence problems
   - Writing clarity
   - Grammar/spelling
   - Formatting issues
   - Citation problems
   - Structural issues

4. **Priority Algorithm**:
    ```python
    def calculate_priority(issue):
        # Factors: severity, impact, effort, dependencies
        # Critical issues: priority 10
        # Major issues affecting multiple chapters: 8-9
        # Major single-chapter issues: 6-7
        # Minor issues: 3-5
        # Suggestions: 1-2
    ```

5. **Generate Issue Reports**:
   Multiple views:
   - By priority (critical first)
   - By chapter/section
   - By category
   - By effort required
   - By dependencies
   - Timeline view

6. **Issue Dashboard**:
   Create `issue_dashboard.md`:
    ```markdown
    ## Issue Dashboard
    
    ### Statistics
    - Total Issues: 47
    - Critical: 2
    - Major: 12
    - Minor: 25
    - Suggestions: 8
    
    ### Resolution Progress
    [=====>     ] 45% Complete
    
    ### Critical Path
    1. Fix methodology description (Ch 3)
    2. Add missing evaluation (Ch 5)
    3. Resolve theoretical gap (Ch 2)
    
    ### Quick Wins (< 30 min)
    - [ ] Fix citations format
    - [ ] Update figure numbers
    - [ ] Correct typos list
    ```

The agent should export issues to common formats (CSV, JSON) and integrate with project management tools.
```

---

## **10. Coherence Analyzer Agent**

**Purpose**: Analyzes overall dissertation coherence and flow.

```markdown
Create a sophisticated Python agent called "CoherenceAnalyzer" that evaluates dissertation coherence and narrative flow.

Advanced Implementation:

1. **Multi-Dimensional Coherence Analysis**:
    ```python
    class CoherenceAnalyzer:
        def analyze_coherence(self, dissertation):
            return {
                'narrative_flow': self.check_narrative_flow(),
                'argument_progression': self.track_argument_building(),
                'conceptual_consistency': self.verify_concepts(),
                'terminological_coherence': self.check_terminology(),
                'methodological_alignment': self.verify_methods(),
                'structural_coherence': self.analyze_structure()
            }
    ```

2. **Narrative Flow Analysis**:
   - Map the story arc across chapters
   - Identify narrative breaks or jumps
   - Check transition quality between sections
   - Verify logical progression
   - Detect circular arguments
   - Find missing connecting elements

3. **Concept Tracking**:
   - Build concept introduction map
   - Track concept development
   - Verify consistent definitions
   - Identify undefined terms
   - Check concept relationships
   - Detect conceptual gaps

4. **Argument Coherence**:
    ```python
      def track_arguments(self):
        # Map claim-evidence pairs
        # Verify support for each claim
        # Track argument dependencies
        # Identify unsupported assertions
        # Check counter-argument handling
        # Assess conclusion alignment
    ```

5. **Terminology Consistency**:
   - Build terminology database
   - Check consistent usage
   - Identify synonyms used inconsistently
   - Verify acronym consistency
   - Track technical term evolution
   - Flag undefined jargon

6. **Generate Coherence Report**:
    ```markdown
    ## Dissertation Coherence Analysis
    
    ### Overall Coherence Score: 78/100
    
    ### Narrative Flow
    - Strong Points: Clear progression from problem to solution
    - Weak Points: Gap between Chapters 3 and 4
    - Missing Links: [Specific locations]
    
    ### Argument Coherence
    - Main Argument Strength: 85/100
    - Supporting Arguments: Well-integrated
    - Unsupported Claims: 3 found [details]
    
    ### Conceptual Consistency
    - Key Concepts: 15 identified
    - Consistency Score: 92/100
    - Issues: "Framework" defined differently in Ch 2 vs Ch 5
    
    ### Recommendations
    1. Add transition paragraph between Sections 3.4 and 4.1
    2. Reconcile definition of "methodology" 
    3. Strengthen evidence for claim in Section 5.3
    
    ### Visualization
    [Include flow diagrams and coherence heatmaps]
    ```

The agent should use NLP techniques for semantic analysis and provide visual coherence maps.
```

---

## **11. Orchestrator Agent (Master Controller)**

**Purpose**: Coordinates all other agents and manages the complete review workflow.

```markdown
Create a master Python agent called "DissertationReviewOrchestrator" that coordinates all review agents and manages the complete workflow.

Master Architecture:

1. **Workflow Management**:
    ```python
    class ReviewOrchestrator:
         def __init__(self):
             self.agents = {
                'mapper': StructureMapper(),
                'context': ContextManager(),
                'section_reviewer': SectionReviewer(),
                'full_reviewer': DissertationReviewer(),
                'cross_ref': CrossReferenceValidator(),
                'standards': AcademicStandardsChecker(),
                'report_gen': ReportGenerator(),
                'revision': RevisionTracker(),
                'issues': IssueTracker(),
                'coherence': CoherenceAnalyzer()
            }
           
        def execute_review(self, review_type, params):
            # Orchestrate agent pipeline
            # Manage dependencies
            # Handle errors and retries
            # Aggregate results
    ```

2. **Review Pipeline Options**:
   Implement multiple workflows:
   - Quick Review: Structure + Basic checks
   - Section Review: Deep dive single section
   - Full Review: Complete dissertation analysis
   - Revision Check: Compare with previous version
   - Pre-Defense: Final comprehensive review
   - Post-Defense: Minor corrections check

3. **Intelligent Agent Coordination**:
    ```python
    def coordinate_agents(self, task):
        pipeline = self.determine_pipeline(task)
        context = self.context_manager.prepare()
       
        for agent in pipeline:
            result = agent.execute(context)
            context.update(result)
            self.handle_agent_output(result)
           
        return self.aggregate_results()
    ```

4. **State Management**:
   - Track review progress
   - Save intermediate results
   - Resume interrupted reviews
   - Maintain review history
   - Version control integration

5. **User Interface**:
   Create CLI interface:
    ```bash
    # Commands
    phd-review init [project-path]
    phd-review map-structure
    phd-review check-standards [--field CS]
    phd-review review-section [section-name] [--depth full]
    phd-review review-all [--comprehensive]
    phd-review track-revision [--base v1]
    phd-review generate-report [--format pdf]
    phd-review status
    phd-review issues [--priority critical]
    ```

6. **Configuration Management**:
    ```yaml
    # review_config.yaml
    project:
        path: /path/to/dissertation
        field: computer_science
        standards: IEEE
        
    review:
        depth: comprehensive
        include_suggestions: true
        check_citations: true
        
    output:
        format: [markdown, pdf]
        include_visualizations: true
        
    agents:
        parallel_execution: true
        max_retries: 3
    ```

7. **Monitoring and Logging**:
   - Real-time progress updates
   - Detailed agent logs
   - Performance metrics
   - Error tracking and recovery
   - Review analytics

The orchestrator should provide a seamless interface for complete dissertation review with minimal user intervention while maintaining full control and customization options.
```

---

## **12. Committee Simulator Agent** (Bonus)

**Purpose**: Simulates different committee member perspectives for comprehensive review.

```markdown
Create an advanced Python agent called "CommitteeSimulator" that simulates multiple dissertation committee perspectives.

Implementation:

1. **Committee Personas**:
    ```python
    COMMITTEE_ROLES = {
        'advisor': {
            'focus': ['contribution', 'completion', 'student_growth'],
            'style': 'supportive_but_thorough'
        },
        'methodologist': {
            'focus': ['research_design', 'statistical_rigor', 'validity'],
            'style': 'highly_critical'
        },
        'domain_expert': {
            'focus': ['theoretical_accuracy', 'literature_gaps', 'field_contribution'],
            'style': 'detail_oriented'
        },
        'external_reviewer': {
            'focus': ['clarity', 'broader_impact', 'accessibility'],
            'style': 'fresh_perspective'
        },
        'department_chair': {
            'focus': ['standards_compliance', 'timeline', 'format'],
            'style': 'administrative'
        }
    }
    ```

2. **Perspective-Based Review**:
   Each persona reviews with different priorities:
   - Weights issues differently
   - Focuses on specific sections
   - Uses unique evaluation criteria
   - Provides characteristic feedback style

3. **Generate Multiple Viewpoints**:
    ```python
    def simulate_committee(self, dissertation):
        reviews = {}
        for role, config in COMMITTEE_ROLES.items():
            reviewer = self.create_reviewer(role, config)
            reviews[role] = reviewer.review(dissertation)
       
        return self.synthesize_reviews(reviews)
    ```

4. **Committee Consensus Report**:
    ```markdown
    ## Simulated Committee Review
    
    ### Unanimous Concerns
    - All members agree: Methodology needs clarification
    
    ### Majority Opinion (3/5 members)
    - Literature review could be more comprehensive
    
    ### Individual Perspectives
    **Advisor**: Strong work, minor revisions needed
    **Methodologist**: Concerns about sample size
    **Domain Expert**: Good theoretical contribution
    
    ### Likely Defense Questions
    1. How does your work extend Smith (2019)?
    2. Why did you choose Method X over Y?
    3. What are the practical implications?
    ```

5. **Defense Preparation Mode**:
   - Generate likely committee questions
   - Identify vulnerable points
   - Suggest preparation strategies
   - Simulate Q&A scenarios

This agent helps students prepare for actual committee reviews by exposing multiple perspectives.
```

---

## **Quick Setup Script**

To quickly deploy all agents, here's a master setup prompt:

```markdown
Create a complete PhD dissertation review system with the following agents working in coordination:

1. StructureMapper - Maps dissertation structure
2. ContextManager - Manages context windows intelligently  
3. SectionReviewer - Reviews individual sections
4. DissertationReviewer - Reviews entire dissertation
5. CrossReferenceValidator - Validates internal references
6. AcademicStandardsChecker - Checks academic compliance
7. ReportGenerator - Generates professional reports
8. RevisionTracker - Tracks changes between versions
9. IssueTracker - Manages all identified issues
10. CoherenceAnalyzer - Analyzes overall coherence
11. ReviewOrchestrator - Coordinates all agents
12. CommitteeSimulator - Provides multiple review perspectives

Project structure:
- /sections/ - Contains dissertation sections
- Each section has /content/, /research/, /structure/, /data/
- /generated/markdown/ - Compiled sections

Create a main.py that:
1. Initializes all agents
2. Provides CLI interface for different review types
3. Manages the review pipeline
4. Generates comprehensive reports
5. Tracks progress and revisions

Include configuration file support, error handling, progress saving, and the ability to resume interrupted reviews. The system should be modular, allowing individual agents to be run independently or as part of the orchestrated pipeline.

Output all code with proper documentation, type hints, and example usage.
```

---

This comprehensive agent system provides a complete, professional-grade dissertation review workflow. Each agent is specialized yet works in harmony with others through the orchestrator. The prompts are detailed enough for Claude Code to generate fully functional implementations while maintaining flexibility for customization based on specific academic fields and requirements.
