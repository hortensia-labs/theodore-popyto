#!/usr/bin/env python3
"""
Report Generator
Generates comprehensive validation reports in multiple formats
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from collections import Counter, defaultdict

class ReportGenerator:
    """Generate formatted reports from validation results"""

    def __init__(self):
        # Setup logging
        log_dir = Path("generated/reports/crv/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

        self.validation_results = None
        self.citations = None
        self.bibliography = None

    def load_validation_data(self):
        """Load validation results and related data"""
        # Load validation results
        validation_path = Path("generated/reports/crv/data/processed/validation_results.json")
        if validation_path.exists():
            with open(validation_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.validation_results = data
                self.logger.info(f"Loaded validation results from {validation_path}")
        else:
            self.logger.warning(f"Validation results not found at {validation_path}")

        # Load citations
        citations_path = Path("generated/reports/crv/data/raw/citations.json")
        if citations_path.exists():
            with open(citations_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.citations = data.get('citations', [])
                self.logger.info(f"Loaded {len(self.citations)} citations")

        # Load bibliography
        bibliography_path = Path("generated/reports/crv/data/raw/bibliography.json")
        if bibliography_path.exists():
            with open(bibliography_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.bibliography = data.get('entries', [])
                self.logger.info(f"Loaded {len(self.bibliography)} bibliography entries")

    def create_report(self):
        """Create the main validation report"""
        if not self.validation_results:
            raise ValueError("No validation results loaded")

        report = self.validation_results.get('report', {})
        detailed_results = self.validation_results.get('detailed_results', [])

        # Generate markdown report
        md_path = Path("generated/reports/crv/final/validation-report.md")
        md_path.parent.mkdir(parents=True, exist_ok=True)

        with open(md_path, 'w', encoding='utf-8') as f:
            # Write header
            f.write("# Citation Validation Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            # Executive Summary
            f.write("## Executive Summary\n\n")
            f.write(self._generate_summary_section(report))

            # Critical Issues Section
            f.write("\n## Critical Issues (Missing Bibliography Entries)\n\n")
            f.write(self._generate_missing_bibliography_section(report))

            # Format Violations Section
            f.write("\n## Format Violations\n\n")
            f.write(self._generate_format_violations_section(report, detailed_results))

            # Warnings Section
            f.write("\n## Warnings and Recommendations\n\n")
            f.write(self._generate_warnings_section(report, detailed_results))

            # Bibliography Issues Section
            f.write("\n## Bibliography Format Issues\n\n")
            f.write(self._generate_bibliography_issues_section())

            # Statistics Section
            f.write("\n## Statistics and Analysis\n\n")
            f.write(self._generate_statistics_section(report))

            # Detailed Results Appendix
            f.write("\n## Appendix: Detailed Validation Results\n\n")
            f.write(self._generate_detailed_appendix(detailed_results))

        self.logger.info(f"Report generated at {md_path}")

        # Generate JSON summary
        json_summary_path = Path("generated/reports/crv/final/validation-summary.json")
        self._generate_json_summary(json_summary_path, report, detailed_results)

        # Generate actionable items list
        actions_path = Path("generated/reports/crv/final/action-items.md")
        self._generate_action_items(actions_path, report, detailed_results)

        return md_path

    def _generate_summary_section(self, report: Dict) -> str:
        """Generate executive summary section"""
        total = report.get('total_citations', 0)
        valid = report.get('valid_citations', 0)
        invalid = report.get('invalid_citations', 0)
        warnings = report.get('warnings', 0)

        # Calculate percentages
        valid_pct = (valid / total * 100) if total > 0 else 0
        invalid_pct = (invalid / total * 100) if total > 0 else 0
        warning_pct = (warnings / total * 100) if total > 0 else 0

        summary = f"""| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Citations** | {total} | 100% |
| ✅ Valid | {valid} | {valid_pct:.1f}% |
| ❌ Invalid | {invalid} | {invalid_pct:.1f}% |
| ⚠️ Warnings | {warnings} | {warning_pct:.1f}% |

### Key Findings

"""
        # Add key findings
        missing_bib = len(report.get('missing_bibliography', []))
        format_issues = len(report.get('format_violations', []))

        if invalid > 0:
            summary += f"- **{missing_bib}** citations have no matching bibliography entry\n"
            summary += f"- **{format_issues}** citations have formatting issues\n"

        if warnings > 0:
            summary += f"- **{warnings}** citations have minor issues or warnings\n"

        # Check for duplicate citations
        duplicates = report.get('duplicate_citations', [])
        if duplicates:
            summary += f"- **{len(duplicates)}** citation keys appear frequently (possible over-citation)\n"

        return summary

    def _generate_missing_bibliography_section(self, report: Dict) -> str:
        """Generate section for missing bibliography entries"""
        missing = report.get('missing_bibliography', [])

        if not missing:
            return "*No missing bibliography entries found - all citations have matching references.*\n"

        section = f"Found **{len(missing)}** citations without matching bibliography entries:\n\n"

        # Group by searched author/year
        grouped = defaultdict(list)
        for item in missing:
            citation = item.get('citation', {})
            searched = item.get('searched_for', {})
            authors = searched.get('authors', [])
            # Handle empty authors list
            first_author = authors[0] if authors else 'Unknown'
            year = searched.get('year', 'Unknown')
            key = f"{first_author}_{year}"
            grouped[key].append(citation)

        for key, citations in sorted(grouped.items()):
            author, year = key.split('_')
            section += f"### Missing: {author} ({year})\n\n"

            for cit in citations:
                location = cit.get('location', {})
                section += f"- **File:** `{Path(location.get('file', '')).name}`\n"
                section += f"  - Line {location.get('line', '')}: `{cit.get('raw_text', '')}`\n"
                section += f"  - Context: *{location.get('context', '').strip()}*\n\n"

        section += "\n**Action Required:** Add these references to the bibliography or correct the citation details.\n"

        return section

    def _generate_format_violations_section(self, report: Dict, detailed_results: List) -> str:
        """Generate section for format violations"""
        violations = report.get('format_violations', [])

        if not violations:
            return "*No format violations found - all citations follow APA 7 formatting rules.*\n"

        section = f"Found **{len(violations)}** citations with formatting issues:\n\n"

        # Group by issue type
        issues_by_type = defaultdict(list)
        for violation in violations:
            for issue in violation.get('issues', []):
                issues_by_type[issue].append(violation.get('citation', {}))

        # Sort by frequency
        for issue_text, citations in sorted(issues_by_type.items(), key=lambda x: len(x[1]), reverse=True):
            section += f"### {issue_text} ({len(citations)} occurrences)\n\n"

            # Show first 5 examples
            for cit in citations[:5]:
                location = cit.get('location', {})
                section += f"- `{cit.get('raw_text', '')}` at {Path(location.get('file', '')).name}:{location.get('line', '')}\n"

            if len(citations) > 5:
                section += f"- *... and {len(citations) - 5} more*\n"

            section += "\n"

        return section

    def _generate_warnings_section(self, report: Dict, detailed_results: List) -> str:
        """Generate warnings and recommendations section"""
        section = ""

        # Duplicate citations warning
        duplicates = report.get('duplicate_citations', [])
        if duplicates:
            section += "### Frequently Cited Sources\n\n"
            section += "The following sources are cited very frequently. Consider:\n"
            section += "- Using narrative citations for variety\n"
            section += "- Ensuring adequate source diversity\n\n"

            for dup in duplicates:
                section += f"- **{dup['citation_key']}**: {dup['count']} citations\n"

            section += "\n"

        # Low confidence matches
        low_confidence = []
        for result in detailed_results:
            if result.get('confidence', 1.0) < 0.8 and result.get('confidence', 1.0) > 0:
                low_confidence.append(result)

        if low_confidence:
            section += "### Low Confidence Matches\n\n"
            section += "The following citations have low-confidence bibliography matches:\n\n"

            for result in low_confidence[:10]:
                # Find the original citation
                cit_id = result.get('citation_id')
                citation = next((c for c in self.citations if c.get('id') == cit_id), {})
                if citation:
                    section += f"- `{citation.get('raw_text', '')}` - Confidence: {result.get('confidence', 0):.2f}\n"

            section += "\n"

        # Style recommendations
        section += "### Style Recommendations\n\n"

        # Calculate citation type distribution
        type_counts = Counter()
        for cit in self.citations:
            type_counts[cit.get('type', 'unknown')] += 1

        total_typed = sum(type_counts.values())
        if total_typed > 0:
            section += "**Citation Type Distribution:**\n\n"
            for cit_type, count in type_counts.most_common():
                pct = (count / total_typed * 100)
                section += f"- {cit_type}: {count} ({pct:.1f}%)\n"

            # Make recommendations based on distribution
            if type_counts.get('parenthetical', 0) > total_typed * 0.8:
                section += "\n⚠️ **Recommendation:** Consider using more narrative citations for variety.\n"
            elif type_counts.get('narrative', 0) > total_typed * 0.8:
                section += "\n⚠️ **Recommendation:** Consider using more parenthetical citations where appropriate.\n"

        return section if section else "*No warnings or recommendations at this time.*\n"

    def _generate_bibliography_issues_section(self) -> str:
        """Generate section for bibliography formatting issues"""
        if not self.bibliography:
            return "*Bibliography not loaded for analysis.*\n"

        section = ""
        issues_found = False

        # Check for invalid entries
        invalid_entries = [e for e in self.bibliography if e.get('validation_status') != 'valid']

        if invalid_entries:
            issues_found = True
            section += f"Found **{len(invalid_entries)}** bibliography entries with issues:\n\n"

            # Group by error type
            errors_by_type = defaultdict(list)
            for entry in invalid_entries:
                for error in entry.get('errors', []):
                    errors_by_type[error].append(entry)

            for error_text, entries in sorted(errors_by_type.items(), key=lambda x: len(x[1]), reverse=True):
                section += f"### {error_text} ({len(entries)} entries)\n\n"

                # Show first 3 examples
                for entry in entries[:3]:
                    section += f"- Line {entry.get('line_number', '')}: `{entry.get('raw_text', '')[:100]}...`\n"

                if len(entries) > 3:
                    section += f"- *... and {len(entries) - 3} more*\n"

                section += "\n"

        if not issues_found:
            section = "*All bibliography entries are properly formatted.*\n"

        return section

    def _generate_statistics_section(self, report: Dict) -> str:
        """Generate statistics and analysis section"""
        stats = report.get('statistics', {})

        section = "### Bibliography Statistics\n\n"
        section += f"- **Total bibliography entries:** {stats.get('total_bibliography_entries', 0)}\n"
        section += f"- **Entries with issues:** {stats.get('bibliography_with_issues', 0)}\n"
        section += f"- **Unique citations in text:** {stats.get('unique_citations', 0)}\n"

        most_cited = stats.get('most_cited')
        if most_cited:
            section += f"- **Most cited source:** {most_cited[0]} ({most_cited[1]} citations)\n"

        section += "\n### Citation Coverage\n\n"

        # Calculate coverage
        if self.bibliography and self.citations:
            # Find which bibliography entries are actually cited
            cited_entries = set()
            for result in self.validation_results.get('detailed_results', []):
                if result.get('matched_bibliography'):
                    cited_entries.add(result['matched_bibliography'])

            uncited = len(self.bibliography) - len(cited_entries)
            section += f"- **Bibliography entries cited:** {len(cited_entries)}/{len(self.bibliography)}\n"

            if uncited > 0:
                section += f"- **Uncited bibliography entries:** {uncited} (consider removing if not needed)\n"

        # Year distribution
        if self.citations:
            years = []
            for cit in self.citations:
                year = cit.get('normalized', {}).get('year', '')
                if year and year.isdigit():
                    years.append(int(year))

            if years:
                section += f"\n### Citation Year Range\n\n"
                section += f"- **Oldest citation:** {min(years)}\n"
                section += f"- **Newest citation:** {max(years)}\n"
                section += f"- **Median year:** {sorted(years)[len(years)//2]}\n"

        return section

    def _generate_detailed_appendix(self, detailed_results: List) -> str:
        """Generate detailed appendix with all validation results"""
        section = "This section contains detailed validation results for each citation.\n\n"

        # Group results by status
        by_status = defaultdict(list)
        for result in detailed_results:
            by_status[result.get('status', 'unknown')].append(result)

        # Show invalid citations first
        if by_status['invalid']:
            section += f"### Invalid Citations ({len(by_status['invalid'])})\n\n"
            section += "<details><summary>Click to expand</summary>\n\n"

            for result in by_status['invalid']:
                cit_id = result.get('citation_id')
                citation = next((c for c in self.citations if c.get('id') == cit_id), {})
                if citation:
                    section += f"#### `{citation.get('raw_text', '')}`\n\n"
                    section += f"- **Location:** {citation.get('location', {}).get('file', '')}:"
                    section += f"{citation.get('location', {}).get('line', '')}\n"

                    for issue in result.get('issues', []):
                        section += f"- **{issue['type']}:** {issue['message']}\n"

                    if result.get('suggestions'):
                        section += "- **Suggestions:**\n"
                        for suggestion in result['suggestions']:
                            section += f"  - {suggestion}\n"

                    section += "\n"

            section += "</details>\n\n"

        # Show warnings
        if by_status.get('warning'):
            section += f"### Warnings ({len(by_status['warning'])})\n\n"
            section += "<details><summary>Click to expand</summary>\n\n"

            for result in by_status['warning'][:20]:  # Limit to first 20
                cit_id = result.get('citation_id')
                citation = next((c for c in self.citations if c.get('id') == cit_id), {})
                if citation:
                    section += f"- `{citation.get('raw_text', '')}`: "
                    issues = [i['message'] for i in result.get('issues', [])]
                    section += ", ".join(issues) + "\n"

            if len(by_status['warning']) > 20:
                section += f"\n*... and {len(by_status['warning']) - 20} more warnings*\n"

            section += "\n</details>\n\n"

        return section

    def _generate_json_summary(self, path: Path, report: Dict, detailed_results: List):
        """Generate JSON summary for programmatic use"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_citations': report.get('total_citations', 0),
                'valid': report.get('valid_citations', 0),
                'invalid': report.get('invalid_citations', 0),
                'warnings': report.get('warnings', 0)
            },
            'critical_issues': {
                'missing_bibliography': len(report.get('missing_bibliography', [])),
                'format_violations': len(report.get('format_violations', []))
            },
            'recommendations': []
        }

        # Add recommendations
        if summary['critical_issues']['missing_bibliography'] > 0:
            summary['recommendations'].append({
                'priority': 'high',
                'action': 'Add missing bibliography entries',
                'count': summary['critical_issues']['missing_bibliography']
            })

        if summary['critical_issues']['format_violations'] > 0:
            summary['recommendations'].append({
                'priority': 'medium',
                'action': 'Fix citation formatting issues',
                'count': summary['critical_issues']['format_violations']
            })

        # Save JSON summary
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        self.logger.info(f"JSON summary saved to {path}")

    def _generate_action_items(self, path: Path, report: Dict, detailed_results: List):
        """Generate actionable items list"""
        with open(path, 'w', encoding='utf-8') as f:
            f.write("# Action Items from Citation Validation\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            # High priority items
            f.write("## 🔴 High Priority (Must Fix)\n\n")

            missing = report.get('missing_bibliography', [])
            if missing:
                f.write(f"### Add {len(missing)} Missing Bibliography Entries\n\n")
                for item in missing[:10]:
                    searched = item.get('searched_for', {})
                    authors = searched.get('authors', [])
                    first_author = authors[0] if authors else 'Unknown'
                    f.write(f"- [ ] Add entry for: {first_author} "
                           f"({searched.get('year', 'Unknown')})\n")

                if len(missing) > 10:
                    f.write(f"- [ ] ... and {len(missing) - 10} more\n")

                f.write("\n")

            # Medium priority items
            f.write("## 🟡 Medium Priority (Should Fix)\n\n")

            violations = report.get('format_violations', [])
            if violations:
                f.write(f"### Fix {len(violations)} Format Violations\n\n")

                # Group by issue type
                issues = defaultdict(int)
                for v in violations:
                    for issue in v.get('issues', []):
                        issues[issue] += 1

                for issue, count in sorted(issues.items(), key=lambda x: x[1], reverse=True)[:5]:
                    f.write(f"- [ ] Fix {count} instances of: {issue}\n")

                f.write("\n")

            # Low priority items
            f.write("## 🟢 Low Priority (Nice to Have)\n\n")

            duplicates = report.get('duplicate_citations', [])
            if duplicates:
                f.write("### Review Frequently Cited Sources\n\n")
                for dup in duplicates[:5]:
                    f.write(f"- [ ] Review {dup['count']} citations of {dup['citation_key']}\n")

                f.write("\n")

            # Bibliography cleanup
            invalid_bib = [e for e in self.bibliography if e.get('validation_status') != 'valid'] if self.bibliography else []
            if invalid_bib:
                f.write(f"### Clean Up {len(invalid_bib)} Bibliography Entries\n\n")
                for entry in invalid_bib[:5]:
                    f.write(f"- [ ] Fix entry at line {entry.get('line_number', '')}\n")

                if len(invalid_bib) > 5:
                    f.write(f"- [ ] ... and {len(invalid_bib) - 5} more\n")

        self.logger.info(f"Action items saved to {path}")

    def append_agent_suggestions(self, enhanced_results: Dict):
        """Append suggestions from the APA validator agent"""
        # This method would be called after running the intelligent agent
        # to add its suggestions to the report

        suggestions_path = Path("generated/reports/crv/final/agent-suggestions.md")

        with open(suggestions_path, 'w', encoding='utf-8') as f:
            f.write("# Intelligent Agent Suggestions\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            if 'patterns_found' in enhanced_results:
                f.write("## Patterns Detected\n\n")
                for pattern in enhanced_results['patterns_found']:
                    f.write(f"- **{pattern['pattern']}**: {pattern['details']}\n")
                    f.write(f"  - Recommendation: {pattern['recommendation']}\n\n")

            if 'systematic_issues' in enhanced_results:
                f.write("## Systematic Issues\n\n")
                for issue in enhanced_results['systematic_issues']:
                    f.write(f"- **{issue['issue']}**: {issue['details']}\n")
                    f.write(f"  - Recommendation: {issue['recommendation']}\n\n")

            if 'recommendations' in enhanced_results:
                f.write("## Overall Recommendations\n\n")
                for rec in enhanced_results['recommendations']:
                    f.write(f"- {rec}\n")

        self.logger.info(f"Agent suggestions saved to {suggestions_path}")

def main():
    """Main execution function"""
    generator = ReportGenerator()

    try:
        # Load validation data
        generator.load_validation_data()

        # Create report
        report_path = generator.create_report()

        print("\n" + "="*50)
        print("REPORT GENERATION COMPLETE")
        print("="*50)
        print(f"✅ Main report: {report_path}")
        print(f"✅ JSON summary: generated/reports/crv/final/validation-summary.json")
        print(f"✅ Action items: generated/reports/crv/final/action-items.md")
        print("="*50)

    except Exception as e:
        logging.error(f"Report generation failed: {e}")
        raise

if __name__ == "__main__":
    main()