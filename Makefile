# Generic Thesis Build System
# Handles any section folder structure under tesis/

# Configuration
SECTIONS_ROOT = /Users/henry/Workbench/PopytoNoPhd/theodore-popyto/sections
GENERATED_ROOT = /Users/henry/Workbench/PopytoNoPhd/theodore-popyto/generated
MARKDOWN_OUTPUT = $(GENERATED_ROOT)/markdown
ICML_OUTPUT = $(GENERATED_ROOT)/icml
WORD_OUTPUT = $(GENERATED_ROOT)/word
SCRIPTS_ROOT = /Users/henry/Workbench/PopytoNoPhd/theodore-popyto/lib

# File patterns for automatic discovery
NUMBERED_PATTERN = [0-9]*.md
ALL_MD_PATTERN = *.md

# ICML conversion configuration (production-ready)
PANDOC_FLAGS = -f markdown+footnotes+definition_lists+smart -t icml -s --wrap=none --reference-links --id-prefix="thesis-"

# Word conversion configuration
PANDOC_WORD_FLAGS = -f markdown+footnotes+definition_lists+smart -t docx -s

# Default target
.DEFAULT_GOAL := help

# Load environment variables
define load_env
	if [ -f .env ]; then \
			set -a; \
			. ./.env; \
			set +a; \
	else \
			echo "$(RED)❌ Error: .env file not found$(RESET)"; \
			exit 1; \
	fi
endef

# Phony targets
.PHONY: help clean compile validate-section merge-section compile-icml compile-word list-sections remove-numbers compile-data scan-citations scan-hyperlinks scan-ref update-links update-book crossref-process fix-url-hyperlinks compile-all-r compile-all-u compile-all-ru reformat-bibliography update-toc validate-citations clean-validation validate-citations-watch test-citations ira-revision validate-crossreferences merge-all merge-parallel clean-merged merge-all-r merge-parallel-r

# Generic compile target: make compile [section-folder]
compile:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)❌ Error: Please specify a section folder$(RESET)"; \
		echo "$(BOLD)Usage:$(RESET) $(WHITE)make compile <section-folder>$(RESET)"; \
		echo "$(BOLD)Example:$(RESET) $(GREEN)make compile 2-seccion-1$(RESET)"; \
		echo ""; \
		$(MAKE) list-sections; \
		exit 1; \
	fi
	@$(MAKE) _validate-section-internal SECTION=$(filter-out $@,$(MAKECMDGOALS))
	@$(MAKE) _merge-section-internal SECTION=$(filter-out $@,$(MAKECMDGOALS))
	@$(MAKE) _compile-icml-internal SECTION=$(filter-out $@,$(MAKECMDGOALS))
	@echo "✅ Section '$(filter-out $@,$(MAKECMDGOALS))' compiled successfully!"

# Validate section structure and files
validate-section:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)❌ Error: Please specify a section folder$(RESET)"; \
		echo "$(BOLD)Usage:$(RESET) $(WHITE)make validate-section <section-folder>$(RESET)"; \
		echo "$(BOLD)Example:$(RESET) $(GREEN)make validate-section 2-seccion-1$(RESET)"; \
		exit 1; \
	fi
	@$(MAKE) _validate-section-internal SECTION=$(filter-out $@,$(MAKECMDGOALS))

# Internal validation function (called with SECTION parameter)
_validate-section-internal:
	@echo "🔍 Validating section: $(SECTION)"
	@if [ ! -d "$(SECTIONS_ROOT)/$(SECTION)" ]; then \
		echo "❌ Error: Section folder '$(SECTION)' not found in $(SECTIONS_ROOT)"; \
		exit 1; \
	fi
	@if [ ! -d "$(SECTIONS_ROOT)/$(SECTION)/content" ]; then \
		echo "❌ Error: 'content' folder not found in $(SECTION)"; \
		exit 1; \
	fi
	@if [ ! -n "$$(find $(SECTIONS_ROOT)/$(SECTION)/content -name '$(ALL_MD_PATTERN)' -type f 2>/dev/null)" ]; then \
		echo "❌ Error: No markdown files found in $(SECTION)/content/"; \
		echo "   Expected pattern: $(ALL_MD_PATTERN)"; \
		exit 1; \
	fi
	@# Ensure generated directories exist
	@mkdir -p $(MARKDOWN_OUTPUT) $(ICML_OUTPUT)
	@echo "   📁 Section structure: ✅"
	@echo "   📝 Markdown files found: $$(find $(SECTIONS_ROOT)/$(SECTION)/content -name '$(ALL_MD_PATTERN)' -type f | wc -l | tr -d ' ')"
	@$(SCRIPTS_ROOT)/utils/validate-files.sh $(SECTIONS_ROOT)/$(SECTION)/content
	@echo "✅ Section validation complete"

# Merge markdown files in content/ into generated/markdown/[section-name].md
merge-section:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)❌ Error: Please specify a section folder$(RESET)"; \
		echo "$(BOLD)Usage:$(RESET) $(WHITE)make merge-section <section-folder>$(RESET)"; \
		echo "$(BOLD)Example:$(RESET) $(GREEN)make merge-section 2-seccion-1$(RESET)"; \
		exit 1; \
	fi
	@$(MAKE) _merge-section-internal SECTION=$(filter-out $@,$(MAKECMDGOALS))

# Parallel merge all sections (optimized Python version)
merge-all:
	@echo "🚀 Parallel merging all sections..."
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --target=all
	@if [ $$? -eq 0 ]; then \
		echo "🎉 All sections merged successfully!"; \
	else \
		echo "$(RED)❌ Error: Parallel merge failed$(RESET)"; \
		exit 1; \
	fi

# Parallel merge with verbose output
merge-parallel:
	@echo "🚀 Parallel merging all sections (verbose)..."
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --target=all --verbose --verify-output
	@if [ $$? -eq 0 ]; then \
		echo "🎉 All sections merged and verified successfully!"; \
	else \
		echo "$(RED)❌ Error: Parallel merge failed$(RESET)"; \
		exit 1; \
	fi

# Parallel merge with heading number removal
merge-all-r:
	@echo "🚀 Parallel merging all sections with heading number removal..."
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --target=all --remove-numbers
	@if [ $$? -eq 0 ]; then \
		echo "🎉 All sections merged with heading numbers removed successfully!"; \
	else \
		echo "$(RED)❌ Error: Parallel merge with number removal failed$(RESET)"; \
		exit 1; \
	fi

# Parallel merge with heading removal and verbose output
merge-parallel-r:
	@echo "🚀 Parallel merging all sections with heading removal (verbose)..."
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --target=all --remove-numbers --verbose --verify-output
	@if [ $$? -eq 0 ]; then \
		echo "🎉 All sections merged with heading numbers removed and verified successfully!"; \
	else \
		echo "$(RED)❌ Error: Parallel merge with number removal failed$(RESET)"; \
		exit 1; \
	fi

# Clean merged files only
clean-merged:
	@echo "🧹 Cleaning merged markdown files..."
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --clean-only
	@if [ $$? -eq 0 ]; then \
		echo "✅ Merged files cleaned successfully!"; \
	else \
		echo "$(RED)❌ Error: Failed to clean merged files$(RESET)"; \
		exit 1; \
	fi

# Internal merge function (called with SECTION parameter) - OPTIMIZED PYTHON VERSION
_merge-section-internal:
	@echo "📝 Merging section: $(SECTION)"
	@python3 $(SCRIPTS_ROOT)/merge-sections-processor.py $(SECTIONS_ROOT) $(MARKDOWN_OUTPUT) --target=single --sections=$(SECTION) --quiet
	@if [ $$? -eq 0 ]; then \
		echo "✅ Merged into: $(MARKDOWN_OUTPUT)/$(SECTION).md"; \
	else \
		echo "$(RED)❌ Error: Failed to merge section $(SECTION)$(RESET)"; \
		exit 1; \
	fi

# Convert merged markdown to ICML
compile-icml:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "🔄 Converting all sections to ICML..."; \
		python3 $(SCRIPTS_ROOT)/compile-icml-processor.py $(MARKDOWN_OUTPUT) $(ICML_OUTPUT) --target=all; \
	else \
		echo "🔄 Converting section to ICML: $(filter-out $@,$(MAKECMDGOALS))"; \
		python3 $(SCRIPTS_ROOT)/compile-icml-processor.py $(MARKDOWN_OUTPUT) $(ICML_OUTPUT) --target=single --sections=$(filter-out $@,$(MAKECMDGOALS)); \
	fi

# Internal ICML conversion (called with SECTION parameter)
_compile-icml-internal:
	@echo "🔄 Converting to ICML: $(SECTION)"
	@python3 $(SCRIPTS_ROOT)/compile-icml-processor.py $(MARKDOWN_OUTPUT) $(ICML_OUTPUT) --target=single --sections=$(SECTION)

# Internal function to compile all sections to ICML
_compile-icml-all:
	@python3 $(SCRIPTS_ROOT)/compile-icml-processor.py $(MARKDOWN_OUTPUT) $(ICML_OUTPUT) --target=all

# Convert merged markdown to Word (docx)
compile-word:
	@mkdir -p $(WORD_OUTPUT)
	@echo "📄 Converting markdown files to Word (.docx)..."
	@SUCCESS=0; FAIL=0; \
	for md_file in $(MARKDOWN_OUTPUT)/*.md; do \
		if [ -f "$$md_file" ]; then \
			BASENAME=$$(basename "$$md_file" .md); \
			echo "   🔄 Converting: $$BASENAME"; \
			if pandoc $(PANDOC_WORD_FLAGS) "$$md_file" -o "$(WORD_OUTPUT)/$$BASENAME.docx" 2>/dev/null; then \
				echo "   ✅ $$BASENAME.docx"; \
				SUCCESS=$$((SUCCESS + 1)); \
			else \
				echo "   $(RED)❌ Failed: $$BASENAME$(RESET)"; \
				FAIL=$$((FAIL + 1)); \
			fi; \
		fi; \
	done; \
	echo ""; \
	echo "📊 Results: $$SUCCESS converted, $$FAIL failed"; \
	if [ $$FAIL -gt 0 ]; then exit 1; fi
	@echo "✅ Word files saved to: $(WORD_OUTPUT)/"

# List all available sections
list-sections:
	@python3 $(SCRIPTS_ROOT)/list-thesis-sections.py $(SECTIONS_ROOT)

# Remove hardcoded heading numbers from generated markdown files
remove-numbers:
	@echo "🔢 Removing hardcoded heading numbers from generated files..."
	@python3 $(SCRIPTS_ROOT)/remove-heading-numbers.py $(MARKDOWN_OUTPUT)

# Scan markdown files and build anchor registry
scan-ref:
	@echo "🔍 Scanning anchors and building registry..."
	@python3 $(SCRIPTS_ROOT)/scan-crossreference-destinations.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data/crossref-registry.json

# Validate cross-references against anchor registry
validate-crossreferences:
	@echo "🔗 Validating cross-references..."
	@python3 $(SCRIPTS_ROOT)/validate-crossreferences.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data/crossref-registry.json

# Scan citations from generated markdown files
scan-citations:
	@echo "📝 Scanning citations from markdown files..."
	@python3 $(SCRIPTS_ROOT)/scan-citations.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data

# Scan URL hyperlinks from generated markdown files
scan-hyperlinks:
	@echo "🔗 Scanning URL hyperlinks from markdown files..."
	@python3 $(SCRIPTS_ROOT)/scan-hyperlinks.py $(MARKDOWN_OUTPUT) $(GENERATED_ROOT)/data/url-registry.json

# Compile data from generated markdown files: citations, cross-references, and URL hyperlinks
compile-data:
	@echo "📊 Compiling data: citations, cross-references, and URL hyperlinks..."
	@echo ""
	@echo "📝 Step 1: Scanning citations..."
	@$(MAKE) scan-citations
	@echo ""
	@echo "🔗 Step 2: Scanning URL hyperlinks..."
	@$(MAKE) scan-hyperlinks
	@echo ""
	@echo "🔍 Step 3: Scanning cross-reference anchors..."
	@$(MAKE) scan-ref
	@echo ""
	@echo "🎉 Data compilation complete!"

# Update InDesign book document links using AppleScript
update-links:
	@echo "🔗 Updating InDesign book document links..."
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/update-links-of-book-documents.applescript" ]; then \
		echo "$(RED)❌ Error: AppleScript not found: $(SCRIPTS_ROOT)/adobe/update-links-of-book-documents.applescript$(RESET)"; \
		exit 1; \
	fi
	@osascript "$(SCRIPTS_ROOT)/adobe/update-links-of-book-documents.applescript"
	@if [ $$? -eq 0 ]; then \
		echo "✅ InDesign book document links updated successfully!"; \
	else \
		echo "$(RED)❌ Error: Failed to update InDesign book document links$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Make sure InDesign is running and the book document is open$(RESET)"; \
		exit 1; \
	fi

# Update InDesign book (synchronize styles, update numbers, preflight)
update-book:
	@echo "📚 Updating InDesign book (sync styles, update numbers, preflight)..."
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/book-sync-update-preflight.applescript" ]; then \
		echo "$(RED)❌ Error: AppleScript not found: $(SCRIPTS_ROOT)/adobe/book-sync-update-preflight.applescript$(RESET)"; \
		exit 1; \
	fi
	@osascript "$(SCRIPTS_ROOT)/adobe/book-sync-update-preflight.applescript"
	@if [ $$? -eq 0 ]; then \
		echo "✅ InDesign book updated successfully (styles synced, numbers updated, preflighted)!"; \
	else \
		echo "$(RED)❌ Error: Failed to update InDesign book$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Make sure InDesign is running and the book document is open$(RESET)"; \
		exit 1; \
	fi

# Process cross-references in InDesign book documents
crossref-process:
	@echo "🔗 Processing cross-references in InDesign book documents..."
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/runner.applescript" ]; then \
		echo "$(RED)❌ Error: AppleScript not found: $(SCRIPTS_ROOT)/adobe/runner.applescript$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/crossref-process.jsx" ]; then \
		echo "$(RED)❌ Error: JSX script not found: $(SCRIPTS_ROOT)/adobe/crossref-process.jsx$(RESET)"; \
		exit 1; \
	fi
	@osascript "$(SCRIPTS_ROOT)/adobe/runner.applescript" "crossref-process.jsx"
	@if [ $$? -eq 0 ]; then \
		echo "✅ Cross-references processed successfully in all InDesign book documents!"; \
	else \
		echo "$(RED)❌ Error: Failed to process cross-references$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Make sure InDesign is running and the book document is open$(RESET)"; \
		exit 1; \
	fi

# Fix URL hyperlinks in InDesign book documents
fix-url-hyperlinks:
	@echo "🔗 Fixing URL hyperlinks in InDesign book documents..."
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/runner.applescript" ]; then \
		echo "$(RED)❌ Error: AppleScript not found: $(SCRIPTS_ROOT)/adobe/runner.applescript$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(SCRIPTS_ROOT)/adobe/hyperlink-process.jsx" ]; then \
		echo "$(RED)❌ Error: JSX script not found: $(SCRIPTS_ROOT)/adobe/hyperlink-process.jsx$(RESET)"; \
		exit 1; \
	fi
	@osascript "$(SCRIPTS_ROOT)/adobe/runner.applescript" "hyperlink-process.jsx"
	@if [ $$? -eq 0 ]; then \
		echo "✅ URL hyperlinks fixed successfully in all InDesign book documents!"; \
	else \
		echo "$(RED)❌ Error: Failed to fix URL hyperlinks$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Make sure InDesign is running and the book document is open$(RESET)"; \
		exit 1; \
	fi

# Clean all generated files
clean:
	@echo "🧹 Cleaning generated files..."
	@rm -f $(MARKDOWN_OUTPUT)/*.md 2>/dev/null || true
	@rm -f $(ICML_OUTPUT)/*.icml 2>/dev/null || true
	@rm -f $(WORD_OUTPUT)/*.docx 2>/dev/null || true
	@rm -f $(GENERATED_ROOT)/data/*.ctcr.md 2>/dev/null || true
	@rm -f $(GENERATED_ROOT)/data/crossref-registry.json 2>/dev/null || true
	@rm -f $(GENERATED_ROOT)/data/url-registry.json 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Compile all valid sections
compile-all:
	@echo "🚀 Compiling all sections (optimized parallel processing)..."
	@echo "📋 Step 1: Parallel merge all sections..."
	@$(MAKE) merge-all
	@echo ""
	@echo "🔄 Step 2: Parallel ICML conversion..."
	@$(MAKE) compile-icml
	@echo ""
	@echo "🔍 Step 3: Scanning citations, hyperlinks, and anchors to build registry..."
	@$(MAKE) compile-data
	@echo ""
	@echo "🔍 Step 4: Validate cross-references..."
	@$(MAKE) validate-crossreferences
	@echo ""
	@echo "🎉 All sections compiled and registry updated!"

# Compile all sections and remove heading numbers
compile-all-r:
	@echo "🚀 Compiling all sections with heading numbers removed (optimized parallel processing)..."
	@echo "📋 Step 1: Parallel merge all sections with heading number removal..."
	@$(MAKE) merge-all-r
	@echo ""
	@echo "🔄 Step 2: Parallel ICML conversion..."
	@$(MAKE) compile-icml
	@echo ""
	@echo "🔍 Step 3: Scanning citations, hyperlinks, and anchors to build registry..."
	@$(MAKE) compile-data
	@echo ""
	@echo "🔍 Step 4: Validate cross-references..."
	@$(MAKE) validate-crossreferences
	@echo ""
	@echo "🎉 All sections compiled with heading numbers removed and registry updated!"

# Compile all sections and update links
compile-all-u:
	@echo "🚀 Compiling all sections and updating links (optimized parallel processing)..."
	@echo "📋 Step 1: Parallel merge all sections..."
	@$(MAKE) merge-all
	@echo ""
	@echo "🔄 Step 2: Parallel ICML conversion..."
	@$(MAKE) compile-icml
	@echo ""
	@echo "🔍 Step 3: Scanning citations, hyperlinks, and anchors to build registry..."
	@$(MAKE) compile-data
	@echo ""
	@echo "🔍 Step 4: Validate cross-references..."
	@$(MAKE) validate-crossreferences
	@echo ""
	@echo "🔗 Step 5: Updating InDesign book document links..."
	@$(MAKE) update-links
	@echo ""
	@echo "🎉 All sections compiled, registry updated, and links updated!"

# Compile all sections, remove numbers, and update links
compile-all-ru:
	@echo "🚀 Compiling all sections with heading numbers removed and updating links (optimized parallel processing)..."
	@echo "📋 Step 1: Parallel merge all sections with heading number removal..."
	@$(MAKE) merge-all-r
	@echo ""
	@echo "🔄 Step 2: Parallel ICML conversion..."
	@$(MAKE) compile-icml
	@echo ""
	@echo "🔍 Step 3: Scanning citations, hyperlinks, and anchors to build registry..."
	@$(MAKE) compile-data
	@echo ""
	@echo "🔍 Step 4: Validate cross-references..."
	@$(MAKE) validate-crossreferences
	@echo ""
	@echo "🔗 Step 5: Updating InDesign book document links..."
	@$(MAKE) update-links
	@echo ""
	@echo "🔗 Step 5.5: Fixing URL hyperlinks..."
	@$(MAKE) fix-url-hyperlinks
	@echo ""
	@echo "🔗 Step 6: Processing cross-references in InDesign book documents..."
	@$(MAKE) crossref-process
	@echo ""
	@echo "🔗 Step 7: Synchronize book, update numbers and preflight..."
	@$(MAKE) update-book
	@echo ""
	@echo "📑 Step 8: Updating Table of Contents..."
	@$(MAKE) update-toc
	@echo ""
	@echo "🎉 All sections compiled with heading numbers removed, registry updated, and links updated!"

# Reformat bibliography ICML file paragraph styles
reformat-bibliography:
	@echo "🔗 Reformat Bibliography..."
	@$(load_env) && \
	if [ -n "$$BIBLIOGRAPHY_SECTION" ]; then \
		python3 $(SCRIPTS_ROOT)/format-bibliography-icml.py; \
		if [ $$? -eq 0 ]; then \
			echo "✅ Bibliography paragraph styles reformatted successfully"; \
		else \
			echo "$(RED)❌ Error: Failed to reformat bibliography$(RESET)"; \
			exit 1; \
		fi; \
	else \
		echo "$(RED)❌ Error: BIBLIOGRAPHY_SECTION not set in .env file$(RESET)"; \
		exit 1; \
	fi
	@echo ""
	@echo "🎉 Bibliography reformatted!"
	@echo ""

# Update TOC
update-toc:
	@echo "📑 Updating Table of Contents..."
	@$(load_env) && \
	if [ -n "$$TOC_DOCUMENT" ] && [ -n "$$TOC_STYLE" ]; then \
			osascript $(SCRIPTS_ROOT)/adobe/update-toc.applescript "$$TOC_DOCUMENT" "$$TOC_STYLE"; \
	else \
			echo "$(RED)❌ Error: TOC_DOCUMENT and/or TOC_STYLE not set in .env file$(RESET)"; \
			exit 1; \
	fi
	@echo ""
	@echo "🎉 Table of Contents updated!"
	@echo ""

# Color definitions
BLUE = \033[1;34m
GREEN = \033[1;32m
YELLOW = \033[1;33m
RED = \033[1;31m
PURPLE = \033[1;35m
CYAN = \033[1;36m
WHITE = \033[1;37m
BOLD = \033[1m
RESET = \033[0m

# Help target
help:
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║$(RESET)              $(BOLD)$(WHITE)📚 Generic Thesis Build System$(RESET)                  $(CYAN)║$(RESET)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(BOLD)$(BLUE)🚀 Main Commands:$(RESET)"
	@echo "  $(GREEN)make compile <section>$(RESET)     - Compile specific section (validate + merge + ICML)"
	@echo "  $(GREEN)make compile-all$(RESET)           - Compile all valid sections and build anchor registry"
	@echo "  $(GREEN)make compile-all-r$(RESET)         - Compile all sections, remove numbers before ICML, build registry"
	@echo "  $(GREEN)make compile-all-u$(RESET)         - Compile all sections, build registry, and update InDesign links"
	@echo "  $(GREEN)make compile-all-ru$(RESET)        - Compile all sections, remove numbers, build registry, and update links"
	@echo "  $(GREEN)make list-sections$(RESET)         - List all available sections"
	@echo "  $(GREEN)make compile-data$(RESET)          - Compile all data: citations, hyperlinks, cross-references"
	@echo "  $(GREEN)make scan-citations$(RESET)       - Scan citations from generated markdown files"
	@echo "  $(GREEN)make scan-hyperlinks$(RESET)      - Scan URL hyperlinks from generated markdown files"
	@echo "  $(GREEN)make scan-ref$(RESET)              - Scan cross-reference anchors and build registry"
	@echo "  $(GREEN)make update-links$(RESET)          - Update InDesign book document links"
	@echo "  $(GREEN)make update-book$(RESET)           - Update InDesign book (sync styles, update numbers, preflight)"
	@echo "  $(GREEN)make crossref-process$(RESET)      - Process cross-references in InDesign book documents"
	@echo "  $(GREEN)make fix-url-hyperlinks$(RESET)   - Fix URL hyperlinks in InDesign book documents"
	@echo "  $(GREEN)make reformat-bibliography$(RESET) - Reformat bibliography ICML file paragraph styles $(YELLOW)requires BIBLIOGRAPHY_SECTION variable in .env file$(RESET)"
	@echo "  $(GREEN)make update-toc$(RESET)            - Update Table of Contents in InDesign $(YELLOW)requires TOC_DOCUMENT and TOC_STYLE variables in .env file$(RESET)"
	@echo "  $(GREEN)make validate-citations$(RESET)    - Validate all citations against bibliography (full analysis)"
	@echo "  $(GREEN)make validate-citations-quick$(RESET) - Quick citation validation (no AI analysis)"
	@echo "  $(GREEN)make validate-citations-watch$(RESET) - Citation validation in watch mode"
	@echo "  $(GREEN)make clean-validation$(RESET)      - Clean citation validation cache and reports"
	@echo "  $(GREEN)make validate-crossreferences$(RESET) - Validate internal cross-references against anchor registry"
	@echo "  $(GREEN)make test-citations$(RESET)        - Run citation validation tests"
	@echo "  $(GREEN)make ira-revision <file>$(RESET)    - Apply IRA (Iterative Refinement and Authenticity) revision workflow"
	@echo "  $(GREEN)make remove-numbers$(RESET)        - Remove hardcoded heading numbers from generated files"
	@echo "  $(GREEN)make merge-all$(RESET)             - Parallel merge all sections (optimized)"
	@echo "  $(GREEN)make merge-parallel$(RESET)        - Parallel merge with verbose output and verification"
	@echo "  $(GREEN)make merge-all-r$(RESET)           - Parallel merge all sections with heading number removal"
	@echo "  $(GREEN)make merge-parallel-r$(RESET)      - Parallel merge with heading number removal and verbose output"
	@echo "  $(GREEN)make clean-merged$(RESET)          - Clean merged markdown files only"
	@echo "  $(GREEN)make clean$(RESET)                 - Remove all generated files"
	@echo ""
	@echo "$(BOLD)$(PURPLE)🔧 Individual Steps:$(RESET)"
	@echo "  $(YELLOW)make validate-section <section>$(RESET)  - Validate section structure"
	@echo "  $(YELLOW)make merge-section <section>$(RESET)     - Merge markdown files only"
	@echo "  $(YELLOW)make compile-icml [section]$(RESET)      - Convert to ICML (all sections if no param)"
	@echo "  $(YELLOW)make compile-word$(RESET)                - Convert all merged markdown to Word (.docx)"
	@echo "  $(YELLOW)make extract-citations$(RESET)          - Extract citations from thesis content only"
	@echo "  $(YELLOW)make process-bibliography$(RESET)       - Process bibliography entries only"
	@echo "  $(YELLOW)make generate-validation-report$(RESET) - Generate validation report only"
	@echo "  $(YELLOW)make validate-citations-step STEP=<step>$(RESET) - Run specific validation step"
	@echo ""
	@echo "$(BOLD)$(CYAN)💡 Examples:$(RESET)"
	@echo "  $(WHITE)make compile 2-seccion-1$(RESET)    $(BLUE)# Compile section 2-seccion-1$(RESET)"
	@echo "  $(WHITE)make compile-all$(RESET)           $(BLUE)# Compile all sections and build registry$(RESET)"
	@echo "  $(WHITE)make compile-all-r$(RESET)         $(BLUE)# Compile all sections, remove numbers, build registry$(RESET)"
	@echo "  $(WHITE)make compile-all-u$(RESET)         $(BLUE)# Compile all sections, build registry, update links$(RESET)"
	@echo "  $(WHITE)make compile-all-ru$(RESET)        $(BLUE)# Compile all sections, remove numbers, build registry, update links$(RESET)"
	@echo "  $(WHITE)make validate-citations$(RESET)    $(BLUE)# Full citation validation with AI analysis$(RESET)"
	@echo "  $(WHITE)make validate-citations-quick$(RESET) $(BLUE)# Quick citation validation without AI$(RESET)"
	@echo "  $(WHITE)make validate-citations-watch$(RESET) $(BLUE)# Citation validation in watch mode$(RESET)"
	@echo "  $(WHITE)make compile-data$(RESET)          $(BLUE)# Compile all data: citations, hyperlinks, cross-refs$(RESET)"
	@echo "  $(WHITE)make scan-citations$(RESET)       $(BLUE)# Scan citations from generated markdown files$(RESET)"
	@echo "  $(WHITE)make scan-hyperlinks$(RESET)      $(BLUE)# Scan URL hyperlinks from generated markdown files$(RESET)"
	@echo "  $(WHITE)make update-links$(RESET)          $(BLUE)# Update InDesign book document links$(RESET)"
	@echo "  $(WHITE)make update-book$(RESET)           $(BLUE)# Update InDesign book (sync styles, update numbers, preflight)$(RESET)"
	@echo "  $(WHITE)make crossref-process$(RESET)      $(BLUE)# Process cross-references in InDesign book documents$(RESET)"
	@echo "  $(WHITE)make fix-url-hyperlinks$(RESET)   $(BLUE)# Fix URL hyperlinks in InDesign book documents$(RESET)"
	@echo "  $(WHITE)make reformat-bibliography$(RESET) $(BLUE)# Reformat bibliography ICML paragraph styles$(RESET)"
	@echo "  $(WHITE)make update-toc$(RESET)            $(BLUE)# Update Table of Contents in InDesign$(RESET)"
	@echo "  $(WHITE)make compile-icml$(RESET)          $(BLUE)# Convert all sections to ICML$(RESET)"
	@echo "  $(WHITE)make merge-all$(RESET)             $(BLUE)# Fast parallel merge of all sections$(RESET)"
	@echo "  $(WHITE)make merge-parallel$(RESET)        $(BLUE)# Parallel merge with detailed progress$(RESET)"
	@echo "  $(WHITE)make merge-all-r$(RESET)           $(BLUE)# Fast parallel merge with heading number removal$(RESET)"
	@echo "  $(WHITE)make merge-parallel-r$(RESET)      $(BLUE)# Parallel merge with number removal and progress$(RESET)"
	@echo "  $(WHITE)make remove-numbers$(RESET)        $(BLUE)# Remove heading numbers for InDesign$(RESET)"
	@echo "  $(WHITE)make extract-citations$(RESET)     $(BLUE)# Extract citations from thesis content only$(RESET)"
	@echo "  $(WHITE)make clean-validation$(RESET)      $(BLUE)# Clean citation validation cache and reports$(RESET)"
	@echo "  $(WHITE)make validate-citations-step STEP=extraction$(RESET) $(BLUE)# Run specific validation step$(RESET)"
	@echo "  $(WHITE)make ira-revision generated/markdown/2-seccion-1.md$(RESET) $(BLUE)# Apply IRA revision workflow$(RESET)"
	@echo ""
	@echo "$(BOLD)$(GREEN)📋 Workflow:$(RESET)"
	@echo "  $(BOLD)1.$(RESET) 🔍 $(CYAN)Validates$(RESET) section structure and files"
	@echo "  $(BOLD)2.$(RESET) 📝 $(YELLOW)Merges$(RESET) all .md files in content/"
	@echo "  $(BOLD)3.$(RESET) 🔄 $(PURPLE)Converts$(RESET) merged file to ICML format"
	@echo "  $(BOLD)4.$(RESET) 🔗 $(BLUE)Builds$(RESET) anchor registry for cross-references"
	@echo "  $(BOLD)5.$(RESET) 🔗 $(GREEN)Updates$(RESET) InDesign book document links (with compile-all-u or compile-all-ru)"
	@echo "  $(BOLD)6.$(RESET) ✅ $(GREEN)Ready$(RESET) for InDesign!"
	@echo ""
	@echo "$(BOLD)$(YELLOW)💻 Quick Start:$(RESET) $(WHITE)make list-sections$(RESET) → $(WHITE)make compile <section-name>$(RESET)"

# Citation validation targets
validate-citations:
	@echo "$(CYAN)🔍 Starting Citation Validation Workflow$(RESET)"
	@echo "$(CYAN)══════════════════════════════════════════════$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/validate_citations.py
	@echo ""
	@echo "$(GREEN)✅ Citation validation complete!$(RESET)"
	@echo "$(BOLD)📊 Reports available at:$(RESET)"
	@echo "  • $(WHITE)generated/reports/crv/final/validation-report.md$(RESET)"
	@echo "  • $(WHITE)generated/reports/crv/final/action-items.md$(RESET)"
	@echo "  • $(WHITE)generated/reports/crv/final/validation-summary.json$(RESET)"

# Run citation validation without agent analysis (faster)
validate-citations-quick:
	@echo "$(CYAN)🔍 Starting Quick Citation Validation (no AI analysis)$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/validate_citations.py --no-agent

# Run specific validation step
validate-citations-step:
	@if [ "$(STEP)" = "" ]; then \
		echo "$(RED)❌ Error: Please specify STEP variable$(RESET)"; \
		echo "$(BOLD)Usage:$(RESET) $(WHITE)make validate-citations-step STEP=<step>$(RESET)"; \
		echo "$(BOLD)Available steps:$(RESET) extraction, bibliography, validation, agent, reports"; \
		exit 1; \
	fi
	@echo "$(CYAN)🔍 Running validation step: $(STEP)$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/validate_citations.py --step $(STEP)

# Clean validation cache and reports
clean-validation:
	@echo "$(YELLOW)🧹 Cleaning citation validation files...$(RESET)"
	@rm -rf references/data/cache/*
	@rm -rf references/logs/*
	@rm -rf references/reports/drafts/*
	@echo "$(GREEN)✅ Validation cache cleaned$(RESET)"

# Watch mode - run validation every 60 seconds
validate-citations-watch:
	@echo "$(CYAN)👁️  Starting citation validation in watch mode (every 60s)$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to stop$(RESET)"
	@while true; do \
		clear; \
		$(MAKE) validate-citations-quick; \
		echo ""; \
		echo "$(CYAN)⏰ Next run in 60 seconds... (Ctrl+C to stop)$(RESET)"; \
		sleep 60; \
	done

# Run citation validation tests
test-citations:
	@echo "$(CYAN)🧪 Running Citation Validation Tests$(RESET)"
	@echo "$(CYAN)══════════════════════════════════════════════$(RESET)"
	@cd $(SECTIONS_ROOT)/.. && python3 tests/test_citation_validation.py
	@echo ""
	@echo "$(GREEN)✅ Tests complete! Check tests/test_report.txt for details$(RESET)"

# IRA (Iterative Refinement and Authenticity) Revision Workflow
ira-revision:
	@if [ "$(filter-out $@,$(MAKECMDGOALS))" = "" ]; then \
		echo "$(RED)❌ Error: Please specify a source file$(RESET)"; \
		echo "$(BOLD)Usage:$(RESET) $(WHITE)make ira-revision <source-file>$(RESET)"; \
		echo "$(BOLD)Example:$(RESET) $(GREEN)make ira-revision generated/markdown/2-seccion-1.md$(RESET)"; \
		echo ""; \
		echo "$(BOLD)$(YELLOW)💡 What this does:$(RESET)"; \
		echo "  • Applies AI text humanization using specialized agents"; \
		echo "  • Auto-generates diagnostic report path from source file name"; \
		echo "  • Applies targeted revisions for burstiness, vocabulary, hedging, etc."; \
		echo "  • Generates timestamped revised files with revision tracking"; \
		echo ""; \
		echo "$(BOLD)$(CYAN)📋 Workflow:$(RESET)"; \
		echo "  $(BOLD)1.$(RESET) 🔍 $(CYAN)Loads$(RESET) source markdown file"; \
		echo "  $(BOLD)2.$(RESET) 📊 $(YELLOW)Auto-generates$(RESET) diagnostic report path"; \
		echo "  $(BOLD)3.$(RESET) 🔄 $(PURPLE)Applies$(RESET) targeted revisions using AI agents"; \
		echo "  $(BOLD)4.$(RESET) 📝 $(BLUE)Generates$(RESET) revised file with tracking metadata"; \
		echo "  $(BOLD)5.$(RESET) ✅ $(GREEN)Ready$(RESET) for human review and further iteration"; \
		echo ""; \
		echo "$(BOLD)$(GREEN)📁 Generated Files:$(RESET)"; \
		echo "  • Diagnostic report: $(YELLOW)generated/reports/ira/<source-name>-diagnostic-report.xml$(RESET)"; \
		echo "  • Revised file: $(YELLOW)<source-directory>/<source-name>-rev1-<timestamp>.md$(RESET)"; \
		exit 1; \
	fi
	@SOURCE_FILE="$(filter-out $@,$(MAKECMDGOALS))"; \
	if [ ! -f "$$SOURCE_FILE" ]; then \
		echo "$(RED)❌ Error: Source file not found: $$SOURCE_FILE$(RESET)"; \
		echo "$(YELLOW)💡 Tip: Make sure the file path is correct and the file exists$(RESET)"; \
		exit 1; \
	fi; \
	echo "$(CYAN)🚀 Starting IRA (Iterative Refinement and Authenticity) Revision Workflow$(RESET)"; \
	echo "$(CYAN)══════════════════════════════════════════════════════════════════════════$(RESET)"; \
	echo "$(BOLD)📄 Source File:$(RESET) $(WHITE)$$SOURCE_FILE$(RESET)"; \
	echo "$(BOLD)📊 Diagnostic Report:$(RESET) $(WHITE)generated/reports/ira/$$(basename "$$SOURCE_FILE" .md)-diagnostic-report.xml$(RESET)"; \
	echo ""; \
	python3 $(SCRIPTS_ROOT)/components/ira/ira_revision_orchestrator.py "$$SOURCE_FILE"; \
	if [ $$? -eq 0 ]; then \
		echo ""; \
		echo "$(GREEN)✅ IRA Revision Workflow Complete!$(RESET)"; \
		echo "$(BOLD)📤 Check the source file directory for the revised output file$(RESET)"; \
		echo "$(BOLD)📈 Review the revision tracking metadata in the output file$(RESET)"; \
		echo "$(BOLD)📊 Diagnostic report saved to: generated/reports/ira/$(RESET)"; \
	else \
		echo ""; \
		echo "$(RED)❌ IRA Revision Workflow Failed$(RESET)"; \
		echo "$(YELLOW)💡 Check the error messages above for troubleshooting$(RESET)"; \
		exit 1; \
	fi

# Extract citations only
extract-citations:
	@echo "$(CYAN)📝 Extracting citations from thesis content...$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/extract_citations.py
	@echo "$(GREEN)✅ Citations extracted to generated/reports/crv/inline-citations.md$(RESET)"

# Process bibliography only
process-bibliography:
	@echo "$(CYAN)📚 Processing bibliography entries...$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/process_bibliography.py
	@echo "$(GREEN)✅ Bibliography processed$(RESET)"

# Generate validation report only (requires previous steps)
generate-validation-report:
	@echo "$(CYAN)📊 Generating validation report...$(RESET)"
	@python3 $(SCRIPTS_ROOT)/components/crv/generate_report.py
	@echo "$(GREEN)✅ Report generated at generated/reports/crv/final/$(RESET)"

# Allow section names to be passed as targets
%:
	@: