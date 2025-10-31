#!/usr/bin/env python3
"""
Test Suite for Citation Validation System
Tests all components of the citation validation workflow
"""

import unittest
import sys
import json
from pathlib import Path
from datetime import datetime

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))
sys.path.insert(0, str(Path(__file__).parent.parent / 'agents'))

from extract_citations import CitationExtractor
from process_bibliography import BibliographyProcessor
from validate_references import ReferenceValidator
from apa_validator_agent import APAValidatorAgent

class TestCitationExtraction(unittest.TestCase):
    """Test citation extraction functionality"""

    def setUp(self):
        self.extractor = CitationExtractor()
        self.test_file = Path("tests/fixtures/sample_content.md")

    def test_extract_standard_citations(self):
        """Test extraction of standard parenthetical citations"""
        citations = self.extractor.extract_from_file(self.test_file)

        # Check that citations were found
        self.assertGreater(len(citations), 0)

        # Find a specific standard citation
        smith_2023 = [c for c in citations if 'Smith, 2023' in c.raw_text]
        self.assertGreater(len(smith_2023), 0)

        # Check normalization
        citation = smith_2023[0]
        self.assertIn('authors', citation.normalized)
        self.assertEqual(citation.normalized['year'], '2023')

    def test_extract_narrative_citations(self):
        """Test extraction of narrative citations"""
        citations = self.extractor.extract_from_file(self.test_file)

        # Find narrative citations
        narrative = [c for c in citations if c.type == 'narrative']
        self.assertGreater(len(narrative), 0)

        # Check specific narrative citation
        smith_narrative = [c for c in narrative if 'Smith' in c.raw_text and '2023' in c.raw_text]
        self.assertGreater(len(smith_narrative), 0)

    def test_extract_complex_citations(self):
        """Test extraction of complex citation formats"""
        citations = self.extractor.extract_from_file(self.test_file)

        # Test et al. citations
        et_al = [c for c in citations if 'et al.' in c.raw_text]
        self.assertGreater(len(et_al), 0)

        # Test citations with page numbers
        with_pages = [c for c in citations if c.type == 'with_pages']
        self.assertGreater(len(with_pages), 0)

        # Test multiple citations
        multiple = [c for c in citations if c.type == 'multiple_citations']
        self.assertGreater(len(multiple), 0)

    def test_extract_special_cases(self):
        """Test extraction of special citation cases"""
        citations = self.extractor.extract_from_file(self.test_file)

        # Test personal communications
        personal = [c for c in citations if 'personal communication' in c.raw_text]
        self.assertGreater(len(personal), 0)

        # Test secondary sources
        secondary = [c for c in citations if 'as cited in' in c.raw_text or 'citado en' in c.raw_text]
        self.assertGreater(len(secondary), 0)

class TestBibliographyProcessing(unittest.TestCase):
    """Test bibliography processing functionality"""

    def setUp(self):
        self.processor = BibliographyProcessor("tests/fixtures")
        self.test_file = Path("tests/fixtures/sample_bibliography.md")

    def test_parse_journal_articles(self):
        """Test parsing of journal article entries"""
        entries = self.processor.load_and_parse()

        # Find journal articles
        journals = [e for e in entries if e.type == 'journal_article']
        self.assertGreater(len(journals), 0)

        # Check specific journal entry
        brown_entry = [e for e in journals if 'Brown' in e.raw_text]
        self.assertGreater(len(brown_entry), 0)

        entry = brown_entry[0]
        self.assertIn('authors', entry.parsed)
        self.assertIn('title', entry.parsed)
        self.assertIn('journal', entry.parsed)
        self.assertIn('year', entry.parsed)

    def test_parse_books(self):
        """Test parsing of book entries"""
        entries = self.processor.load_and_parse()

        # Find books
        books = [e for e in entries if e.type == 'book']
        self.assertGreater(len(books), 0)

        # Check parsing
        for book in books:
            self.assertIn('title', book.parsed)
            self.assertIn('year', book.parsed)

    def test_parse_web_resources(self):
        """Test parsing of web resource entries"""
        entries = self.processor.load_and_parse()

        # Find web resources
        web = [e for e in entries if e.type == 'web_resource']
        self.assertGreater(len(web), 0)

        # Check URL extraction
        for resource in web:
            self.assertTrue(
                'url' in resource.parsed or
                'Retrieved from' in resource.raw_text or
                'https://' in resource.raw_text
            )

    def test_build_index(self):
        """Test bibliography index building"""
        entries = self.processor.load_and_parse()

        # Check index creation
        self.assertIn('by_year', self.processor.index)
        self.assertIn('by_author', self.processor.index)
        self.assertIn('by_author_year', self.processor.index)

        # Check year index
        self.assertIn('2023', self.processor.index['by_year'])

        # Check author index
        self.assertGreater(len(self.processor.index['by_author']), 0)

class TestValidation(unittest.TestCase):
    """Test citation validation functionality"""

    def setUp(self):
        # First, extract citations and process bibliography
        self.extractor = CitationExtractor()
        self.processor = BibliographyProcessor("tests/fixtures")

        # Extract from test fixtures
        self.citations = self.extractor.extract_from_file(Path("tests/fixtures/sample_content.md"))
        self.bibliography = self.processor.load_and_parse()

        # Save to expected locations for validator
        Path("references/data/raw").mkdir(parents=True, exist_ok=True)

        with open("references/data/raw/citations.json", 'w') as f:
            json.dump({'citations': [c.to_dict() for c in self.citations]}, f)

        with open("references/data/raw/bibliography.json", 'w') as f:
            json.dump({'entries': [e.to_dict() for e in self.bibliography]}, f)

        # Initialize validator
        self.validator = ReferenceValidator()
        self.validator.load_data()

    def test_validate_citation_format(self):
        """Test citation format validation"""
        for citation in self.citations[:5]:  # Test first 5 citations
            status, issues = self.validator.validate_citation_format(citation.to_dict())

            # Check that validation returns a status
            self.assertIn(status, ['valid', 'invalid', 'warning'])

            # Check that issues is a list
            self.assertIsInstance(issues, list)

    def test_match_citations_to_bibliography(self):
        """Test matching citations to bibliography entries"""
        matched = 0
        unmatched = 0

        for citation in self.citations:
            match_id, confidence = self.validator.match_citation_to_bibliography(citation.to_dict())

            if match_id:
                matched += 1
                # Check confidence score
                self.assertGreaterEqual(confidence, 0.0)
                self.assertLessEqual(confidence, 1.0)
            else:
                unmatched += 1

        # Should have both matched and unmatched citations in test data
        self.assertGreater(matched, 0)
        self.assertGreater(unmatched, 0)  # Test data includes phantom citations

    def test_generate_validation_report(self):
        """Test validation report generation"""
        report = self.validator.validate_all()

        # Check report structure
        self.assertIn('total_citations', report.__dict__)
        self.assertIn('valid_citations', report.__dict__)
        self.assertIn('invalid_citations', report.__dict__)
        self.assertIn('missing_bibliography', report.__dict__)
        self.assertIn('format_violations', report.__dict__)

        # Check that report values make sense
        total = report.total_citations
        self.assertEqual(total, report.valid_citations + report.invalid_citations + report.warnings)

class TestAPAValidatorAgent(unittest.TestCase):
    """Test intelligent APA validation agent"""

    def setUp(self):
        self.agent = APAValidatorAgent()

    def test_analyze_context(self):
        """Test contextual analysis of citations"""
        citation = "(Smith, 2023)"
        context = '"This is a direct quote" (Smith, 2023) that needs a page number.'

        analysis = self.agent.analyze_context(citation, context)

        # Check analysis structure
        self.assertIn('citation_type', analysis)
        self.assertIn('context_appropriate', analysis)
        self.assertIn('suggestions', analysis)

        # Should detect missing page number for quote
        self.assertGreater(len(analysis['suggestions']), 0)

    def test_suggest_corrections(self):
        """Test correction suggestions"""
        invalid_citation = {
            'raw_text': 'Smith et al 2023',
            'normalized': {'authors': ['Smith', 'et al.'], 'year': '2023'},
            'type': 'parenthetical'
        }

        corrections = self.agent.suggest_correction(invalid_citation)

        # Should suggest corrections
        self.assertGreater(len(corrections), 0)

        # Check correction structure
        for correction in corrections:
            self.assertIn('original', correction)
            self.assertIn('corrected', correction)
            self.assertIn('explanation', correction)

    def test_validate_special_cases(self):
        """Test validation of special citation cases"""
        # Test personal communication
        personal_comm = {
            'raw_text': '(J. Smith, personal communication, January 15, 2023)',
            'normalized': {},
            'type': 'personal_communication'
        }

        validation = self.agent.validate_special_cases(personal_comm)

        self.assertTrue(validation['is_special_case'])
        self.assertEqual(validation['case_type'], 'personal_communication')
        self.assertTrue(validation['valid'])  # Personal comms don't need bibliography

        # Test secondary source
        secondary = {
            'raw_text': '(Thompson, 1995, as cited in Smith, 2023)',
            'normalized': {},
            'type': 'secondary'
        }

        validation = self.agent.validate_special_cases(secondary)

        self.assertTrue(validation['is_special_case'])
        self.assertEqual(validation['case_type'], 'secondary_source')

class TestIntegration(unittest.TestCase):
    """Integration tests for the complete workflow"""

    def test_complete_workflow(self):
        """Test the complete citation validation workflow"""
        # Step 1: Extract citations
        extractor = CitationExtractor()
        citations = extractor.extract_from_file(Path("tests/fixtures/sample_content.md"))
        self.assertGreater(len(citations), 0)

        # Step 2: Process bibliography
        processor = BibliographyProcessor("tests/fixtures")
        bibliography = processor.load_and_parse()
        self.assertGreater(len(bibliography), 0)

        # Step 3: Save data
        Path("references/data/raw").mkdir(parents=True, exist_ok=True)

        with open("references/data/raw/citations.json", 'w') as f:
            json.dump({'citations': [c.to_dict() for c in citations]}, f)

        with open("references/data/raw/bibliography.json", 'w') as f:
            json.dump({'entries': [e.to_dict() for e in bibliography]}, f)

        # Step 4: Validate
        validator = ReferenceValidator()
        validator.load_data()
        report = validator.validate_all()

        # Step 5: Check results
        self.assertGreater(report.total_citations, 0)
        self.assertGreater(len(report.missing_bibliography), 0)  # Test data has phantom citations

        # Step 6: Save validation results
        validator.save_validation_results(report)

        # Verify files were created
        self.assertTrue(Path("references/data/processed/validation_results.json").exists())

def run_tests():
    """Run all tests and generate report"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add all test cases
    suite.addTests(loader.loadTestsFromTestCase(TestCitationExtraction))
    suite.addTests(loader.loadTestsFromTestCase(TestBibliographyProcessing))
    suite.addTests(loader.loadTestsFromTestCase(TestValidation))
    suite.addTests(loader.loadTestsFromTestCase(TestAPAValidatorAgent))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Generate test report
    report_path = Path("tests/test_report.txt")
    with open(report_path, 'w') as f:
        f.write(f"Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("="*50 + "\n\n")
        f.write(f"Tests run: {result.testsRun}\n")
        f.write(f"Failures: {len(result.failures)}\n")
        f.write(f"Errors: {len(result.errors)}\n")
        f.write(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%\n")

        if result.failures:
            f.write("\n\nFailures:\n")
            for test, traceback in result.failures:
                f.write(f"\n{test}:\n{traceback}\n")

        if result.errors:
            f.write("\n\nErrors:\n")
            for test, traceback in result.errors:
                f.write(f"\n{test}:\n{traceback}\n")

    print(f"\nTest report saved to: {report_path}")

    return result.wasSuccessful()

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)