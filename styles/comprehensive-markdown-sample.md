# Comprehensive Markdown Sample Document

This document contains examples of every major Markdown feature to test conversion to ICML format.

## Table of Contents

1. [Headers](#headers)
2. [Text Formatting](#text-formatting)
3. [Lists](#lists)
4. [Links and References](#links-and-references)
5. [Images](#images)
6. [Code](#code)
7. [Tables](#tables)
8. [Blockquotes](#blockquotes)
9. [Horizontal Rules](#horizontal-rules)
10. [Line Breaks and Paragraphs](#line-breaks-and-paragraphs)
11. [Footnotes](#footnotes)
12. [Math](#math)
13. [Special Characters](#special-characters)

---

## Headers

List of headers from Level 2 onwards:

## Header Level 2  

### Header Level 3

#### Header Level 4

##### Header Level 5

###### Header Level 6

---

## Text Formatting

### Basic Formatting

This is **bold text** using asterisks.
This is **bold text** using underscores.

This is *italic text* using asterisks.
This is *italic text* using underscores.

This is ***bold and italic*** text.
This is ***bold and italic*** text.
This is ***mixed bold and italic*** text.

This is ~~strikethrough~~ text.

This is `inline code` text.

### Extended Formatting

This is ==highlighted== text (if supported).
This is ^superscript^ text (if supported).
This is ~subscript~ text (if supported).

### Escape Characters

These characters need escaping: \* \_ \` \# \+ \- \. \! \[ \] \( \) \{ \} \\ \|

---

## Lists

### Unordered Lists

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Deep nested item 2.2.1
    - Deep nested item 2.2.2
- Item 3

### Ordered Lists

1. First item
2. Second item
   1. Nested ordered item 2.1
   2. Nested ordered item 2.2
      1. Deep nested item 2.2.1
      2. Deep nested item 2.2.2
3. Third item

Alternative numbering:

1) Item one
2) Item two
3) Item three

### Mixed Lists

1. Ordered item 1
   - Unordered nested item
   - Another unordered nested item
2. Ordered item 2
   1. Ordered nested item
   2. Another ordered nested item
      - Mixed deep nesting

## Links and References

### Inline Links

This is an [inline link](https://www.apple.com).
This is an [inline link with title](https://www.apple.com "Example Website").

### Reference Links

This is a [reference link][1].
This is another [reference link][link-ref].
This is a [case-insensitive reference link][CASE-INSENSITIVE].

[1]: https://www.apple.com
[link-ref]: https://www.apple.com/page "Reference Link Title"
[case-insensitive]: https://www.apple.com/case

### Automatic Links

<https://www.apple.com>
<email@example.com>

### Internal Links (Anchors)

Link to [Headers section](#headers).
Link to [Text Formatting](#text-formatting).

---

## Images

### Inline Images

![Alt text](../../media/images/placeholder_300x200.png)
![Alt text with title](../../media/images/placeholder_300x200.png "Image Title")

### Reference Images

![Reference image][image-ref]
![Another reference image][img-2]

[image-ref]: ../../media/images/placeholder_400x300.png "Reference Image Title"
[img-2]: ../../media/images/placeholder_200x150.png

### Images with Links

[![Linked image](../../media/images/placeholder_200x150.png)](https://www.apple.com)

---

## Code

### Inline Code

Use the `printf()` function to print text.
This is `inline code` within a sentence.
HTML tags like `<div>` and `<span>` are often used.

### Code Blocks

#### Fenced Code Blocks

```text
Plain code block without syntax highlighting
This is just plain text
Multiple lines supported
```

```javascript
// JavaScript code with syntax highlighting
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));
```

```python
# Python code example
def hello_world():
    """Print hello world message"""
    print("Hello, World!")
    return True

if __name__ == "__main__":
    hello_world()
```

```html
<!-- HTML code example -->
<!DOCTYPE html>
<html>
<head>
    <title>Sample Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
</body>
</html>
```

```css
/* CSS code example */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h1 {
    color: #333;
    font-size: 2.5rem;
}
```

```json
{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample JSON file",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  }
}
```

---

## Tables

### Basic Table

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1 Col 1 | Row 1 Col 2 | Row 1 Col 3 |
| Row 2 Col 1 | Row 2 Col 2 | Row 2 Col 3 |

### Table with Alignment

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Text         | Text           | Text          |
| More content | More content   | More content  |

### Complex Table

| Feature | Description | Status | Priority |
|---------|-------------|--------|----------|
| **Bold text** | Text formatting | ✅ Complete | High |
| *Italic text* | Text formatting | ✅ Complete | High |
| `Code` | Inline code | ✅ Complete | Medium |
| [Links](http://example.com) | Hyperlinks | ✅ Complete | High |

### Table with Line Breaks

| Column 1 | Column 2 |
|----------|----------|
| Line 1<br>Line 2 | Single line |
| Multiple<br>Line<br>Content | Another line |

---

## Blockquotes

### Simple Blockquote

> This is a simple blockquote.
> It can span multiple lines.
> Each line is prefixed with >.

### Nested Blockquotes

> This is the first level of quoting.
>
> > This is nested blockquote.
> > It's indented further.
>
> Back to the first level.

### Blockquotes with Other Elements

> ## Header in blockquote
>
> This blockquote contains other markdown elements:
>
> 1. Ordered list item
> 2. Another item
>
> - Unordered list item
> - Another item
>
> Here's some `inline code` and a [link to example.com](http://example.com).
>
> ```javascript
> // Code block in blockquote
> console.log("Hello from blockquote");
> ```

---

## Horizontal Rules

Three or more hyphens:

---

## Line Breaks and Paragraphs

This is the first paragraph. It contains multiple sentences. Each sentence flows naturally into the next.

This is the second paragraph, separated by a blank line.

This line ends with two spaces for a line break.  
This line comes after the line break.

This line ends with a backslash for a line break.\
This line also comes after a line break.

---

## Footnotes

Here's a sentence with a footnote[^1].

Here's another sentence with a longer footnote[^longnote].

You can also use inline footnotes^[This is an inline footnote].

Multiple references to the same footnote[^1].

[^1]: This is the first footnote.

[^longnote]: This is a longer footnote with multiple paragraphs.

    It can contain code blocks, lists, and other elements.

    ```text
    Code in footnote
    ```

- List item in footnote
- Another item

---

## Math

### Inline Math

The quadratic formula is $x = (-b ± √(b^2 - 4ac))/(2a)$.

Einstein's famous equation: $E = mc^2$.

### Block Math

---

## Special Characters

### Unicode Characters

Mathematical symbols: α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω

Currency symbols: $ € £ ¥ ₹ ₽ ₩

Arrows: ← → ↑ ↓ ↔ ⇒ ⇔

Symbols: © ® ™ § ¶ † ‡ • … ‰ ′ ″ ‴

### HTML Entities

&lt; &gt; &amp; &quot; &apos; &nbsp;

### Special Punctuation

Em dash: —
En dash: –
Ellipsis: …
Single quotes: 'text'
Double quotes: "text"

---

## Definition Lists (if supported)

Term 1
:   Definition 1

Term 2
:   Definition 2a
:   Definition 2b

Complex Term
:   This definition has multiple paragraphs.
    It can contain other markdown elements like **bold** and *italic* text.
    ```text
    Code blocks are also supported
    ```

---

## Abbreviations (if supported)

*[HTML]: Hyper Text Markup Language
*[CSS]: Cascading Style Sheets
*[JS]: JavaScript

The HTML specification is maintained by the W3C. CSS is used for styling, and JS adds interactivity.

---

## Admonitions/Callouts (if supported)

!!! note
    This is a note admonition.

!!! warning
    This is a warning admonition.

!!! danger
    This is a danger admonition.

---

## Raw HTML (if supported)

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px;">
This is raw HTML content within markdown.
<strong>Bold text using HTML</strong>
<em>Italic text using HTML</em>
</div>

<details>
<summary>Click to expand</summary>
This content is hidden by default and can be expanded.

It can contain **markdown** formatting too.
</details>

---

## Comments (if supported)

<!-- This is an HTML comment -->
<!-- 
Multi-line
HTML comment
-->

---

## Conclusion

This document demonstrates the comprehensive range of Markdown syntax features. When converted to ICML, each of these elements should map to appropriate InDesign styles and formatting options.

### Summary of Features Covered

1. ✅ Headers (6 levels)
2. ✅ Text formatting (bold, italic, strikethrough, code)
3. ✅ Lists (ordered, unordered, nested, task lists)
4. ✅ Links (inline, reference, automatic)
5. ✅ Images (inline, reference, linked)
6. ✅ Code blocks (indented, fenced, with syntax highlighting)
7. ✅ Tables (basic, aligned, complex)
8. ✅ Blockquotes (simple, nested, with elements)
9. ✅ Horizontal rules
10. ✅ Line breaks and paragraphs
11. ✅ Footnotes
12. ✅ Mathematical expressions
13. ✅ Special characters and Unicode
14. ✅ Definition lists
15. ✅ Abbreviations
16. ✅ Raw HTML
17. ✅ Comments

This comprehensive test will help identify how each markdown element is converted to ICML styles and formatting.
