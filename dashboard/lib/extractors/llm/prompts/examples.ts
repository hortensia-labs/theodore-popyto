/**
 * Few-Shot Examples for Metadata Extraction
 *
 * Provides example inputs and outputs for the LLM
 */

import type { ExtractedMetadata } from '../providers/types';

export interface ExampleExtraction {
  contentType: 'html' | 'pdf';
  textSample: string;
  expectedOutput: ExtractedMetadata & {
    confidence: {
      itemType?: number;
      title?: number;
      creators?: number;
      date?: number;
    };
    extractionNotes?: string;
  };
}

export const METADATA_EXTRACTION_EXAMPLES: ExampleExtraction[] = [
  // Example 1: Academic article from HTML
  {
    contentType: 'html',
    textSample: `
<meta name="citation_title" content="Deep Learning in Natural Language Processing">
<meta name="citation_author" content="Smith, John">
<meta name="citation_author" content="Doe, Jane">
<meta name="citation_publication_date" content="2023-05-15">
<meta name="citation_journal_title" content="Journal of Machine Learning Research">

Abstract: This paper presents a comprehensive survey of deep learning techniques
applied to natural language processing tasks...
    `.trim(),
    expectedOutput: {
      itemType: 'journalArticle',
      title: 'Deep Learning in Natural Language Processing',
      creators: [
        {
          creatorType: 'author',
          firstName: 'John',
          lastName: 'Smith',
        },
        {
          creatorType: 'author',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      ],
      date: '2023-05-15',
      confidence: {
        itemType: 0.95,
        title: 1.0,
        creators: 0.95,
        date: 1.0,
      },
      extractionNotes: 'All metadata found in citation meta tags',
    },
  },

  // Example 2: Blog post
  {
    contentType: 'html',
    textSample: `
<h1>Getting Started with Machine Learning</h1>
<div class="author">By Sarah Johnson</div>
<time datetime="2024-03-20">March 20, 2024</time>

In this blog post, I'll walk you through the basics of machine learning
and show you how to build your first model...
    `.trim(),
    expectedOutput: {
      itemType: 'blogPost',
      title: 'Getting Started with Machine Learning',
      creators: [
        {
          creatorType: 'author',
          firstName: 'Sarah',
          lastName: 'Johnson',
        },
      ],
      date: '2024-03-20',
      confidence: {
        itemType: 0.85,
        title: 0.9,
        creators: 0.8,
        date: 0.95,
      },
      extractionNotes:
        'Detected as blog post based on informal tone and structure. Author name parsed from byline.',
    },
  },

  // Example 3: PDF academic paper
  {
    contentType: 'pdf',
    textSample: `
Neural Networks and Deep Learning
A Comprehensive Introduction

Authors: Michael Brown¹, Lisa Chen², Robert Taylor¹

¹ Department of Computer Science, Stanford University
² MIT Computer Science and Artificial Intelligence Laboratory

Published in: Proceedings of the International Conference on Machine Learning (ICML)
June 2023

Abstract
This paper presents a comprehensive introduction to neural networks
and deep learning techniques...
    `.trim(),
    expectedOutput: {
      itemType: 'conferencePaper',
      title: 'Neural Networks and Deep Learning: A Comprehensive Introduction',
      creators: [
        {
          creatorType: 'author',
          firstName: 'Michael',
          lastName: 'Brown',
        },
        {
          creatorType: 'author',
          firstName: 'Lisa',
          lastName: 'Chen',
        },
        {
          creatorType: 'author',
          firstName: 'Robert',
          lastName: 'Taylor',
        },
      ],
      date: '2023',
      confidence: {
        itemType: 0.9,
        title: 0.85,
        creators: 0.8,
        date: 0.9,
      },
      extractionNotes:
        'Identified as conference paper from "Proceedings of" text. Date extracted from publication line.',
    },
  },
];

/**
 * Format examples for inclusion in prompt
 */
export function formatExamplesForPrompt(
  examples: ExampleExtraction[],
  contentType?: 'html' | 'pdf'
): string {
  // Filter examples by content type if specified
  const relevantExamples = contentType
    ? examples.filter(ex => ex.contentType === contentType)
    : examples;

  const formattedExamples = relevantExamples.map((example, index) => {
    return `
EXAMPLE ${index + 1}:
Content Type: ${example.contentType}

Document Text:
${example.textSample}

Expected Output:
${JSON.stringify(example.expectedOutput, null, 2)}
    `.trim();
  });

  return formattedExamples.join('\n\n---\n\n');
}
