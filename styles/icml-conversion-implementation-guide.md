# ICML Conversion Implementation Guide

## Overview

This guide provides practical steps for implementing custom Markdown to ICML conversion for your thesis project, based on the analysis of Pandoc's output.

## Implementation Options

### Option 1: Pandoc with Custom Templates

#### Create Custom ICML Template

##### 1. **Base Template Creation**

```bash
# Generate a reference template
pandoc --print-default-template icml > custom-thesis-template.icml

# Or start with your existing base-document-empty-story.icml
cp book/base-document-empty-story.icml templates/thesis-base-template.icml
```

##### 2. **Customize Style Definitions**

Edit the template to match your thesis requirements:

```xml
<!-- Custom Header Styles -->
<ParagraphStyle Self="ParagraphStyle/Header1" Name="Header1" 
    LeftIndent="0" PointSize="24" FontStyle="Bold">
  <Properties>
    <BasedOn type="object">$ID/NormalParagraphStyle</BasedOn>
    <AppliedFont type="string">Garamond Premier Pro</AppliedFont>
    <SpaceBefore type="unit">24</SpaceBefore>
    <SpaceAfter type="unit">12</SpaceAfter>
  </Properties>
</ParagraphStyle>

<ParagraphStyle Self="ParagraphStyle/Header2" Name="Header2" 
    LeftIndent="0" PointSize="18" FontStyle="Bold">
  <Properties>
    <BasedOn type="object">$ID/NormalParagraphStyle</BasedOn>
    <AppliedFont type="string">Garamond Premier Pro</AppliedFont>
    <SpaceBefore type="unit">18</SpaceBefore>
    <SpaceAfter type="unit">9</SpaceAfter>
  </Properties>
</ParagraphStyle>

<!-- Custom Paragraph Style -->
<ParagraphStyle Self="ParagraphStyle/Paragraph" Name="Paragraph" 
    LeftIndent="0" FirstLineIndent="12">
  <Properties>
    <BasedOn type="object">$ID/NormalParagraphStyle</BasedOn>
    <AppliedFont type="string">Garamond Premier Pro</AppliedFont>
    <PointSize type="unit">11</PointSize>
    <Leading type="unit">13.2</Leading>
    <SpaceAfter type="unit">6</SpaceAfter>
    <Justification type="enumeration">LeftAlign</Justification>
  </Properties>
</ParagraphStyle>

<!-- Custom Code Block Style -->
<ParagraphStyle Self="ParagraphStyle/CodeBlock" Name="CodeBlock" 
    LeftIndent="12" RightIndent="12">
  <Properties>
    <BasedOn type="object">$ID/NormalParagraphStyle</BasedOn>
    <AppliedFont type="string">Source Code Pro</AppliedFont>
    <PointSize type="unit">9</PointSize>
    <Leading type="unit">10.8</Leading>
    <SpaceBefore type="unit">6</SpaceBefore>
    <SpaceAfter type="unit">6</SpaceAfter>
    <!-- Add background color if needed -->
    <FillColor type="string">Color/C=5 M=0 Y=0 K=0</FillColor>
  </Properties>
</ParagraphStyle>
```

#### Usage Command

```bash
pandoc input.md -f markdown -t icml --template=templates/thesis-base-template.icml -o output.icml
```

### Option 2: Post-Processing Script

Create a Python script to modify Pandoc's output:

```python
#!/usr/bin/env python3
"""
Custom ICML post-processor for thesis formatting
"""

import xml.etree.ElementTree as ET
import sys
import re

def customize_icml(input_file, output_file):
    """Apply custom formatting to generated ICML"""
    
    # Parse the ICML file
    tree = ET.parse(input_file)
    root = tree.getroot()
    
    # Find and modify character styles
    char_styles = root.find('.//RootCharacterStyleGroup')
    if char_styles is not None:
        # Modify code style
        for style in char_styles.findall('.//CharacterStyle[@Name="Code"]'):
            properties = style.find('Properties')
            if properties is not None:
                # Change font to Source Code Pro
                font_elem = ET.SubElement(properties, 'AppliedFont')
                font_elem.set('type', 'string')
                font_elem.text = 'Source Code Pro'
                
                # Add background color
                fill_elem = ET.SubElement(properties, 'FillColor')
                fill_elem.set('type', 'string')
                fill_elem.text = 'Color/C=5 M=0 Y=0 K=0'
    
    # Find and modify paragraph styles
    para_styles = root.find('.//RootParagraphStyleGroup')
    if para_styles is not None:
        # Customize header styles
        header_configs = {
            'Header1': {'size': '24', 'space_before': '24', 'space_after': '12'},
            'Header2': {'size': '18', 'space_before': '18', 'space_after': '9'},
            'Header3': {'size': '14', 'space_before': '14', 'space_after': '7'},
        }
        
        for header_name, config in header_configs.items():
            for style in para_styles.findall(f'.//ParagraphStyle[@Name="{header_name}"]'):
                style.set('PointSize', config['size'])
                
                properties = style.find('Properties')
                if properties is not None:
                    # Add spacing
                    space_before = ET.SubElement(properties, 'SpaceBefore')
                    space_before.set('type', 'unit')
                    space_before.text = config['space_before']
                    
                    space_after = ET.SubElement(properties, 'SpaceAfter')
                    space_after.set('type', 'unit')
                    space_after.text = config['space_after']
                    
                    # Set font
                    font_elem = ET.SubElement(properties, 'AppliedFont')
                    font_elem.set('type', 'string')
                    font_elem.text = 'Garamond Premier Pro'
    
    # Add custom table styling
    customize_tables(root)
    
    # Add custom footnote styling
    customize_footnotes(root)
    
    # Write the modified ICML
    tree.write(output_file, encoding='utf-8', xml_declaration=True)

def customize_tables(root):
    """Apply custom table formatting"""
    table_styles = root.find('.//RootTableStyleGroup')
    if table_styles is not None:
        # Find existing table style or create new one
        table_style = table_styles.find('.//TableStyle[@Name="Table"]')
        if table_style is not None:
            # Add border formatting
            table_style.set('TopBorderStrokeWeight', '1')
            table_style.set('BottomBorderStrokeWeight', '1')
            table_style.set('LeftBorderStrokeWeight', '0.5')
            table_style.set('RightBorderStrokeWeight', '0.5')

def customize_footnotes(root):
    """Apply custom footnote formatting"""
    # Find footnote elements and apply custom styling
    for footnote in root.findall('.//Footnote'):
        # Customize footnote appearance
        footnote.set('FootnoteNumberingStyle', 'Arabic')
        footnote.set('FootnotePrefix', '')
        footnote.set('FootnoteSuffix', '. ')

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 customize_icml.py input.icml output.icml")
        sys.exit(1)
    
    customize_icml(sys.argv[1], sys.argv[2])
    print(f"Customized ICML saved to {sys.argv[2]}")
```

#### Usage

```bash
# Convert with Pandoc
pandoc input.md -f markdown -t icml -s -o temp.icml

# Apply custom formatting
python3 customize_icml.py temp.icml final.icml

# Clean up
rm temp.icml
```

### Option 3: Makefile Integration

Add to your existing Makefile:

```makefile
# ICML conversion configuration
ICML_TEMPLATE = templates/thesis-base-template.icml
ICML_PROCESSOR = scripts/customize_icml.py

# ICML conversion target
%.icml: %.md
 @echo "Converting $< to ICML..."
 @pandoc $< -f markdown -t icml -s --template=$(ICML_TEMPLATE) -o $@.temp
 @python3 $(ICML_PROCESSOR) $@.temp $@
 @rm $@.temp
 @echo "✓ ICML created: $@"

# Convert entire section to ICML
section-1-icml: $(SECTION_1_CHAPTER)
 @echo "Converting section 1 to ICML..."
 @$(MAKE) $(SECTION_1_CHAPTER:.md=.icml)
 @echo "✓ Section 1 ICML ready for InDesign"

# Convert all chapters to ICML
icml-all: $(ALL_CHAPTERS)
 @echo "Converting all chapters to ICML..."
 @for chapter in $(ALL_CHAPTERS); do \
  $(MAKE) $${chapter%.md}.icml; \
 done
 @echo "✓ All chapters converted to ICML"
```

## Advanced Customization

### Custom Style Definitions

Create a comprehensive style library:

```xml
<!-- Academic Citation Style -->
<CharacterStyle Self="CharacterStyle/Citation" Name="Citation" FontStyle="Italic">
  <Properties>
    <BasedOn type="object">$ID/NormalCharacterStyle</BasedOn>
    <PointSize type="unit">10</PointSize>
  </Properties>
</CharacterStyle>

<!-- Emphasis Style -->
<CharacterStyle Self="CharacterStyle/Emphasis" Name="Emphasis" FontStyle="Italic">
  <Properties>
    <BasedOn type="object">$ID/NormalCharacterStyle</BasedOn>
    <FillColor type="string">Color/C=0 M=50 Y=100 K=0</FillColor>
  </Properties>
</CharacterStyle>

<!-- Block Quote Style -->
<ParagraphStyle Self="ParagraphStyle/BlockQuote" Name="BlockQuote" 
    LeftIndent="24" RightIndent="12">
  <Properties>
    <BasedOn type="object">$ID/NormalParagraphStyle</BasedOn>
    <FontStyle type="enumeration">Italic</FontStyle>
    <PointSize type="unit">10</PointSize>
    <Leading type="unit">12</Leading>
    <SpaceBefore type="unit">12</SpaceBefore>
    <SpaceAfter type="unit">12</SpaceAfter>
    <LeftBorderStrokeWeight type="unit">2</LeftBorderStrokeWeight>
    <LeftBorderStrokeColor type="string">Color/C=20 M=0 Y=0 K=0</LeftBorderStrokeColor>
  </Properties>
</ParagraphStyle>
```

### Bibliography Integration

For academic citations, consider integrating with pandoc-citeproc:

```bash
# With bibliography
pandoc input.md --bibliography=bibliography.bib --csl=apa.csl -f markdown -t icml -s -o output.icml
```

### Multi-language Support

Add language-specific styles:

```xml
<CharacterStyle Self="CharacterStyle/Spanish" Name="Spanish">
  <Properties>
    <BasedOn type="object">$ID/NormalCharacterStyle</BasedOn>
    <AppliedLanguage type="string">$ID/Spanish: Castilian</AppliedLanguage>
  </Properties>
</CharacterStyle>
```

## Testing and Validation

### Validation Script

```bash
#!/bin/bash
# validate_icml.sh

ICML_FILE="$1"

if [ ! -f "$ICML_FILE" ]; then
    echo "Error: ICML file not found: $ICML_FILE"
    exit 1
fi

# Check XML validity
xmllint --noout "$ICML_FILE" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Valid XML structure"
else
    echo "✗ Invalid XML structure"
    exit 1
fi

# Check for required style groups
if grep -q "RootCharacterStyleGroup" "$ICML_FILE" && \
   grep -q "RootParagraphStyleGroup" "$ICML_FILE"; then
    echo "✓ Required style groups present"
else
    echo "✗ Missing required style groups"
    exit 1
fi

# Count styles
char_styles=$(grep -c "CharacterStyle.*Name=" "$ICML_FILE")
para_styles=$(grep -c "ParagraphStyle.*Name=" "$ICML_FILE")

echo "Character styles: $char_styles"
echo "Paragraph styles: $para_styles"
echo "✓ ICML validation complete"
```

## Recommended Workflow

1. **Setup Phase**
   - Create custom ICML template based on your design requirements
   - Set up post-processing script for fine-tuning
   - Integrate with your existing Makefile

2. **Development Phase**
   - Test with sample content
   - Iterate on style definitions
   - Validate output in InDesign

3. **Production Phase**
   - Apply to actual thesis chapters
   - Batch process multiple files
   - Final review and adjustments

This implementation approach gives you full control over the conversion process while leveraging Pandoc's robust Markdown parsing and ICML generation capabilities.
