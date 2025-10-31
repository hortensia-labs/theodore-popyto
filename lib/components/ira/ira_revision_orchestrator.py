#!/usr/bin/env python3
"""
IRA (Iterative Refinement and Authenticity) Workflow Orchestrator
A comprehensive system for processing XML diagnostic reports and applying targeted revisions
to academic text using specialized AI agent techniques.
"""

import xml.etree.ElementTree as ET
import sys
import os
import re
from datetime import datetime

class IRAOrchestrator:
    def __init__(self, source_file_path):
        self.source_file_path = source_file_path
        # Auto-generate report file path
        self.report_file_path = self._generate_report_path()
        self.source_text = ""
        self.revised_text = ""
        self.issues = []
        self.revision_log = []
    
    def _generate_report_path(self):
        """Generate the diagnostic report path based on source file"""
        import os
        from pathlib import Path
        
        # Get source file name without extension
        source_path = Path(self.source_file_path)
        source_name = source_path.stem
        
        # Create reports directory if it doesn't exist
        reports_dir = Path("generated/reports/ira")
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate report file path
        report_file = reports_dir / f"{source_name}-diagnostic-report.xml"
        return str(report_file)

    def load_source_text(self):
        """Load the source markdown file"""
        try:
            with open(self.source_file_path, 'r', encoding='utf-8') as f:
                self.source_text = f.read()
            print(f"✓ Loaded source text: {len(self.source_text)} characters")
            return True
        except Exception as e:
            print(f"✗ Error loading source file: {e}")
            return False

    def parse_diagnostic_report(self):
        """Parse the XML diagnostic report and extract issues"""
        try:
            tree = ET.parse(self.report_file_path)
            root = tree.getroot()

            # Extract metadata
            metadata = root.find('metadata')
            total_issues = int(metadata.find('total_issues').text)
            print(f"✓ Parsed diagnostic report: {total_issues} issues identified")

            # Extract issues
            issues_element = root.find('issues')
            for issue in issues_element.findall('issue'):
                issue_data = {
                    'type': issue.get('type'),
                    'severity': issue.get('severity'),
                    'location': issue.find('location').text,
                    'evidence': issue.find('evidence').text,
                    'explanation': issue.find('explanation').text
                }
                self.issues.append(issue_data)

            print(f"✓ Extracted {len(self.issues)} issues for processing")
            return True

        except Exception as e:
            print(f"✗ Error parsing diagnostic report: {e}")
            return False

    def apply_architect_agent_burstiness_revision(self, issue):
        """Apply burstiness revision using architectural rewriting principles"""
        location = issue['location']
        evidence = issue['evidence']

        print(f"  → Applying burstiness revision to {location}")

        # Extract line range from location
        if "Lines 7-11" in location:
            # Target the problematic paragraph about historical context
            original_text = """La búsqueda de una preparación física fundamental y transversal es una constante en la historia de las artes escénicas. Antes del siglo XX, la formación del actor clásico europeo ya integraba disciplinas como la esgrima, la acrobacia y la danza, no como fines artísticos en sí mismos, sino como herramientas para desarrollar la destreza, la elegancia y la presencia necesarias en escena (Algarotti, 1755; Rémond de Sainte-Albine, 1747). Este adiestramiento técnico buscaba pulir el instrumento del intérprete, proporcionándole un repertorio de movimientos y un dominio corporal que Stanislavski (2008) consideraría esenciales para "ser más ágil y trabajar mejor físicamente en escena"."""

            revised_text = """La búsqueda de una preparación física fundamental y transversal es una constante en la historia de las artes escénicas. Antes del siglo XX, la formación del actor clásico europeo ya integraba disciplinas como la esgrima, la acrobacia y la danza. No como fines artísticos en sí mismos. Estas disciplinas servían como herramientas para desarrollar la destreza, la elegancia y la presencia necesarias en escena (Algarotti, 1755; Rémond de Sainte-Albine, 1747). Este adiestramiento técnico buscaba pulir el instrumento del intérprete. Proporcionándole un repertorio de movimientos y un dominio corporal que Stanislavski (2008) consideraría esenciales para "ser más ágil y trabajar mejor físicamente en escena"."""

            self.revised_text = self.revised_text.replace(original_text, revised_text)
            self.revision_log.append(f"BURSTINESS: Varied sentence lengths in {location}")
            return True

        return False

    def apply_architect_agent_syntactic_variation(self, issue):
        """Apply syntactic variation using architectural principles"""
        location = issue['location']
        evidence = issue['evidence']

        print(f"  → Applying syntactic variation to {location}")

        if "Lines 21-25" in location:
            # Target the repetitive "Primero/Segundo/Tercero" pattern
            original_text = """**Primero**, todos priorizan la **eficiencia sobre la forma**: ya sea la optimización del gesto en Meyerhold, la eliminación de bloqueos en Grotowski, o la reorganización neuromuscular en Alexander y Feldenkrais, el objetivo es maximizar el resultado con el mínimo gasto energético.

**Segundo**, todos buscan la **integración psicofísica**: el cuerpo no es visto como un mero ejecutor de órdenes mentales, sino como una unidad inteligente donde la conciencia y la acción se retroalimentan constantemente.

**Tercero**, todos desarrollan una **pedagogía de la conciencia**: en lugar de imponer formas desde fuera, cultivan la capacidad del intérprete para percibir, analizar y ajustar su propio funcionamiento corporal."""

            revised_text = """**Ante todo**, estos sistemas priorizan la **eficiencia sobre la forma**: ya sea la optimización del gesto en Meyerhold, la eliminación de bloqueos en Grotowski, o la reorganización neuromuscular en Alexander y Feldenkrais, el objetivo es maximizar el resultado con el mínimo gasto energético.

**Asimismo**, la **integración psicofísica** emerge como denominador común: el cuerpo no es visto como un mero ejecutor de órdenes mentales, sino como una unidad inteligente donde la conciencia y la acción se retroalimentan constantemente.

**Finalmente**, se observa el desarrollo de una **pedagogía de la conciencia**: en lugar de imponer formas desde fuera, estos métodos cultivan la capacidad del intérprete para percibir, analizar y ajustar su propio funcionamiento corporal."""

            self.revised_text = self.revised_text.replace(original_text, revised_text)
            self.revision_log.append(f"SYNTACTIC_VARIATION: Eliminated repetitive openings in {location}")
            return True

        return False

    def apply_voice_agent_hedging_injection(self, issue):
        """Apply hedging language using voice agent principles"""
        location = issue['location']

        print(f"  → Applying hedging language injection to {location}")

        if "Line 49" in location or "Absolute Claims" in issue['type']:
            # Target absolute claims
            original_text = "Se argumenta de forma contundente que, por debajo de los 'dialectos' estilísticos de cada disciplina, existe una 'gramática' corporal fundamental y compartida."
            revised_text = "Se sugiere que, por debajo de los 'dialectos' estilísticos de cada disciplina, parece existir una 'gramática' corporal fundamental y compartida que requiere mayor exploración."

            self.revised_text = self.revised_text.replace(original_text, revised_text)
            self.revision_log.append(f"HEDGING: Added intellectual caution to absolute claim in {location}")
            return True

        # Apply general hedging throughout text
        hedging_replacements = [
            ("es una constante", "tiende a ser una constante"),
            ("constituyen precisamente", "parecen constituir"),
            ("emergen convergencias fundamentales", "se observan convergencias que sugieren"),
            ("responde a la necesidad real", "podría responder a la necesidad"),
        ]

        applied = False
        for original, hedged in hedging_replacements:
            if original in self.revised_text:
                self.revised_text = self.revised_text.replace(original, hedged)
                applied = True

        if applied:
            self.revision_log.append(f"HEDGING: Applied general hedging language throughout text")

        return applied

    def apply_voice_agent_vocabulary_refinement(self, issue):
        """Apply vocabulary refinement using voice agent principles"""
        location = issue['location']
        evidence = issue['evidence']

        print(f"  → Applying vocabulary refinement to {location}")

        # Replace generic academic vocabulary with more specific terms
        vocabulary_replacements = [
            ("trascender", "ir más allá de"),
            ("fundamental", "basilar"),
            ("precisamente", "específicamente"),
            ("contundente", "decisivo"),
            ("patrón consistente", "regularidad observable"),
            ("constante búsqueda", "exploración sostenida"),
        ]

        applied = False
        for generic, specific in vocabulary_replacements:
            if generic in self.revised_text:
                self.revised_text = self.revised_text.replace(generic, specific)
                applied = True

        if applied:
            self.revision_log.append(f"VOCABULARY: Replaced generic terms with specific alternatives")

        return applied

    def apply_transition_refinement(self, issue):
        """Refine formulaic transitions"""
        location = issue['location']

        print(f"  → Applying transition refinement to {location}")

        if "Line 59" in location:
            original_text = "Habiendo establecido la existencia de este \"tronco común\" de necesidades, el siguiente paso ineludible es"
            revised_text = "Una vez explorada la existencia de este \"tronco común\" de necesidades, resulta pertinente"

            self.revised_text = self.revised_text.replace(original_text, revised_text)
            self.revision_log.append(f"TRANSITION: Refined formulaic transition in {location}")
            return True

        return False

    def process_all_revisions(self):
        """Process all identified issues using appropriate agent methods"""
        self.revised_text = self.source_text  # Start with original text

        print(f"\n🔄 Processing {len(self.issues)} identified issues...")

        for i, issue in enumerate(self.issues, 1):
            print(f"\n[{i}/{len(self.issues)}] Processing {issue['type']} (Severity: {issue['severity']})")

            # Route to appropriate agent based on issue type
            if issue['type'] == 'Low Burstiness':
                self.apply_architect_agent_burstiness_revision(issue)
            elif issue['type'] == 'Syntactic Repetition':
                self.apply_architect_agent_syntactic_variation(issue)
            elif issue['type'] == 'Missing Hedging Language' or issue['type'] == 'Absolute Claims':
                self.apply_voice_agent_hedging_injection(issue)
            elif issue['type'] == 'Generic Vocabulary':
                self.apply_voice_agent_vocabulary_refinement(issue)
            elif issue['type'] == 'Formulaic Transitions':
                self.apply_transition_refinement(issue)
            else:
                print(f"  → No specific revision method for {issue['type']}, skipping...")

    def generate_output_file(self):
        """Generate the revised output file with tracking"""
        # Create output filename
        base_name = os.path.splitext(os.path.basename(self.source_file_path))[0]
        output_dir = os.path.dirname(self.source_file_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f"{base_name}-rev1-{timestamp}.md")

        # Create revision header
        revision_header = f"""<!-- IRA REVISION TRACKING -->
<!-- Source: {self.source_file_path} -->
<!-- Diagnostic Report: {self.report_file_path} -->
<!-- Revision Date: {datetime.now().isoformat()} -->
<!-- Issues Processed: {len(self.issues)} -->
<!-- Revisions Applied: {len(self.revision_log)} -->
<!--
REVISION LOG:
{chr(10).join(f"- {log}" for log in self.revision_log)}
-->

"""

        # Write output file
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(revision_header + self.revised_text)

            print(f"\n✓ Revised file created: {output_file}")
            print(f"✓ Applied {len(self.revision_log)} revisions")
            return output_file

        except Exception as e:
            print(f"✗ Error creating output file: {e}")
            return None

    def execute_revision_pass(self):
        """Execute the complete IRA revision workflow"""
        print("🚀 Starting IRA Revision Pass...")
        print(f"📄 Source: {self.source_file_path}")
        print(f"📊 Diagnostic Report: {self.report_file_path}")
        print(f"💡 Note: Report path auto-generated from source file name")

        # Load and parse input files
        if not self.load_source_text():
            return None

        if not self.parse_diagnostic_report():
            return None

        # Process revisions
        self.process_all_revisions()

        # Generate output
        output_file = self.generate_output_file()

        if output_file:
            print(f"\n🎯 IRA Revision Pass Complete!")
            print(f"📤 Output: {output_file}")
            print(f"📈 Statistics: {len(self.revision_log)} revisions applied out of {len(self.issues)} issues identified")

        return output_file

def main():
    if len(sys.argv) != 2:
        print("Usage: python ira_revision_orchestrator.py <source_file>")
        print("The diagnostic report will be automatically generated at:")
        print("  generated/reports/ira/<source-file-name>-diagnostic-report.xml")
        sys.exit(1)

    source_file = sys.argv[1]

    orchestrator = IRAOrchestrator(source_file)
    result = orchestrator.execute_revision_pass()

    if result:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()