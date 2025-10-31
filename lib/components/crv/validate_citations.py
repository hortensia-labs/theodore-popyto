#!/usr/bin/env python3
"""
Main Citation Validation Workflow Orchestrator
Coordinates the complete citation validation process
"""

import sys
import json
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

# Add paths for imports - all modules now in the same directory
sys.path.insert(0, str(Path(__file__).parent))

from extract_citations import CitationExtractor
from process_bibliography import BibliographyProcessor
from validate_references import ReferenceValidator
from generate_report import ReportGenerator
from apa_validator_agent import APAValidatorAgent

class CitationValidationOrchestrator:
    """Main orchestrator for the citation validation workflow"""

    def __init__(self, verbose: bool = False, use_agent: bool = True):
        self.verbose = verbose
        self.use_agent = use_agent
        self.start_time = datetime.now()

        # Setup logging
        log_level = logging.DEBUG if verbose else logging.INFO
        log_dir = Path("generated/reports/crv/logs")
        log_dir.mkdir(parents=True, exist_ok=True)

        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / f"orchestrator_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                logging.StreamHandler() if verbose else logging.NullHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def run_extraction(self) -> Dict[str, Any]:
        """Step 1: Extract citations from content files"""
        print("\n" + "="*50)
        print("STEP 1: EXTRACTING CITATIONS")
        print("="*50)

        try:
            extractor = CitationExtractor()
            citations = extractor.process_all_sections()
            extractor.save_results()

            self.logger.info(f"Extracted {len(citations)} citations")
            print(f"✅ Extracted {len(citations)} citations from content files")

            return {
                'success': True,
                'count': len(citations),
                'stats': extractor.stats
            }
        except Exception as e:
            self.logger.error(f"Citation extraction failed: {e}")
            print(f"❌ Citation extraction failed: {e}")
            return {'success': False, 'error': str(e)}

    def run_bibliography_processing(self) -> Dict[str, Any]:
        """Step 2: Process bibliography entries"""
        print("\n" + "="*50)
        print("STEP 2: PROCESSING BIBLIOGRAPHY")
        print("="*50)

        try:
            processor = BibliographyProcessor()
            entries = processor.load_and_parse()
            processor.save_results()

            self.logger.info(f"Processed {len(entries)} bibliography entries")
            print(f"✅ Processed {len(entries)} bibliography entries")
            print(f"   - Valid: {processor.stats['valid_entries']}")
            print(f"   - Invalid: {processor.stats['invalid_entries']}")

            return {
                'success': True,
                'count': len(entries),
                'stats': processor.stats
            }
        except Exception as e:
            self.logger.error(f"Bibliography processing failed: {e}")
            print(f"❌ Bibliography processing failed: {e}")
            return {'success': False, 'error': str(e)}

    def run_validation(self) -> Dict[str, Any]:
        """Step 3: Validate citations against bibliography"""
        print("\n" + "="*50)
        print("STEP 3: VALIDATING REFERENCES")
        print("="*50)

        try:
            validator = ReferenceValidator()
            validator.load_data()
            report = validator.validate_all()
            validator.save_validation_results(report)

            self.logger.info(f"Validation complete: {report.valid_citations} valid, {report.invalid_citations} invalid")
            print(f"✅ Validation complete:")
            print(f"   - Valid: {report.valid_citations}")
            print(f"   - Invalid: {report.invalid_citations}")
            print(f"   - Warnings: {report.warnings}")
            print(f"   - Missing bibliography: {len(report.missing_bibliography)}")

            return {
                'success': True,
                'report': report.to_dict(),
                'summary': {
                    'valid': report.valid_citations,
                    'invalid': report.invalid_citations,
                    'warnings': report.warnings
                }
            }
        except Exception as e:
            self.logger.error(f"Validation failed: {e}")
            print(f"❌ Validation failed: {e}")
            return {'success': False, 'error': str(e)}

    def run_agent_analysis(self) -> Optional[Dict[str, Any]]:
        """Step 4: Run intelligent agent analysis (optional)"""
        if not self.use_agent:
            return None

        print("\n" + "="*50)
        print("STEP 4: INTELLIGENT ANALYSIS")
        print("="*50)

        try:
            # Load citations and bibliography for agent
            with open("generated/reports/crv/data/raw/citations.json", 'r') as f:
                citations_data = json.load(f)
                citations = citations_data.get('citations', [])

            with open("generated/reports/crv/data/raw/bibliography.json", 'r') as f:
                bibliography_data = json.load(f)
                bibliography = bibliography_data.get('entries', [])

            agent = APAValidatorAgent()
            batch_report = agent.batch_validate(citations, bibliography)

            self.logger.info(f"Agent analysis complete: {len(batch_report['patterns_found'])} patterns found")
            print(f"✅ Intelligent analysis complete:")
            print(f"   - Patterns found: {len(batch_report['patterns_found'])}")
            print(f"   - Systematic issues: {len(batch_report['systematic_issues'])}")
            print(f"   - Recommendations: {len(batch_report['recommendations'])}")

            # Save agent report
            agent_report_path = Path("generated/reports/crv/data/processed/agent_analysis.json")
            with open(agent_report_path, 'w', encoding='utf-8') as f:
                json.dump(batch_report, f, indent=2, ensure_ascii=False)

            return {
                'success': True,
                'analysis': batch_report
            }
        except Exception as e:
            self.logger.error(f"Agent analysis failed: {e}")
            print(f"⚠️ Agent analysis failed (non-critical): {e}")
            return {'success': False, 'error': str(e)}

    def generate_reports(self, agent_results: Optional[Dict] = None) -> Dict[str, Any]:
        """Step 5: Generate final reports"""
        print("\n" + "="*50)
        print("STEP 5: GENERATING REPORTS")
        print("="*50)

        try:
            generator = ReportGenerator()
            generator.load_validation_data()
            report_path = generator.create_report()

            # Add agent suggestions if available
            if agent_results and agent_results.get('success'):
                generator.append_agent_suggestions(agent_results['analysis'])
                print("✅ Added intelligent agent suggestions")

            self.logger.info(f"Reports generated successfully")
            print(f"✅ Reports generated:")
            print(f"   - Main report: {report_path}")
            print(f"   - JSON summary: generated/reports/crv/final/validation-summary.json")
            print(f"   - Action items: generated/reports/crv/final/action-items.md")

            if agent_results and agent_results.get('success'):
                print(f"   - Agent suggestions: generated/reports/crv/final/agent-suggestions.md")

            return {
                'success': True,
                'report_path': str(report_path)
            }
        except Exception as e:
            self.logger.error(f"Report generation failed: {e}")
            print(f"❌ Report generation failed: {e}")
            return {'success': False, 'error': str(e)}

    def run_complete_workflow(self) -> bool:
        """Run the complete citation validation workflow"""
        print("\n" + "🚀 STARTING CITATION VALIDATION WORKFLOW")
        print("="*60)

        workflow_results = {}

        # Step 1: Extract citations
        extraction_result = self.run_extraction()
        workflow_results['extraction'] = extraction_result
        if not extraction_result['success']:
            return self._finalize_workflow(False, workflow_results)

        # Step 2: Process bibliography
        bibliography_result = self.run_bibliography_processing()
        workflow_results['bibliography'] = bibliography_result
        if not bibliography_result['success']:
            return self._finalize_workflow(False, workflow_results)

        # Step 3: Validate
        validation_result = self.run_validation()
        workflow_results['validation'] = validation_result
        if not validation_result['success']:
            return self._finalize_workflow(False, workflow_results)

        # Step 4: Agent analysis (optional)
        agent_result = self.run_agent_analysis()
        if agent_result:
            workflow_results['agent'] = agent_result

        # Step 5: Generate reports
        report_result = self.generate_reports(agent_result)
        workflow_results['reports'] = report_result

        # Finalize
        success = report_result['success']
        return self._finalize_workflow(success, workflow_results)

    def _finalize_workflow(self, success: bool, results: Dict) -> bool:
        """Finalize workflow and print summary"""
        elapsed = datetime.now() - self.start_time

        print("\n" + "="*60)
        if success:
            print("✅ WORKFLOW COMPLETED SUCCESSFULLY")
        else:
            print("❌ WORKFLOW FAILED")
        print("="*60)

        print(f"\nTime elapsed: {elapsed.total_seconds():.2f} seconds")

        # Save workflow summary
        summary_path = Path("generated/reports/crv/logs/workflow_summary.json")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': self.start_time.isoformat(),
                'elapsed_seconds': elapsed.total_seconds(),
                'success': success,
                'results': results
            }, f, indent=2)

        if success and results.get('validation', {}).get('summary'):
            summary = results['validation']['summary']
            print(f"\n📊 Final Statistics:")
            print(f"   - Valid citations: {summary['valid']}")
            print(f"   - Invalid citations: {summary['invalid']}")
            print(f"   - Warnings: {summary['warnings']}")

            if results.get('validation', {}).get('report', {}).get('missing_bibliography'):
                missing_count = len(results['validation']['report']['missing_bibliography'])
                if missing_count > 0:
                    print(f"\n⚠️  Action Required: {missing_count} citations need bibliography entries")

        return success

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Validate thesis citations and bibliography',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run complete validation
  %(prog)s --verbose         # Run with detailed output
  %(prog)s --no-agent        # Skip intelligent agent analysis
  %(prog)s --step extraction  # Run only extraction step
        """
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )

    parser.add_argument(
        '--no-agent',
        action='store_true',
        help='Skip intelligent agent analysis'
    )

    parser.add_argument(
        '--step', '-s',
        choices=['extraction', 'bibliography', 'validation', 'agent', 'reports', 'all'],
        default='all',
        help='Run only specific step (default: all)'
    )

    args = parser.parse_args()

    # Initialize orchestrator
    orchestrator = CitationValidationOrchestrator(
        verbose=args.verbose,
        use_agent=not args.no_agent
    )

    # Run workflow or specific step
    success = False

    if args.step == 'all':
        success = orchestrator.run_complete_workflow()
    elif args.step == 'extraction':
        result = orchestrator.run_extraction()
        success = result['success']
    elif args.step == 'bibliography':
        result = orchestrator.run_bibliography_processing()
        success = result['success']
    elif args.step == 'validation':
        result = orchestrator.run_validation()
        success = result['success']
    elif args.step == 'agent':
        result = orchestrator.run_agent_analysis()
        success = result['success'] if result else False
    elif args.step == 'reports':
        result = orchestrator.generate_reports()
        success = result['success']

    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()