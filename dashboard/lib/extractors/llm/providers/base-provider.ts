/**
 * Base Provider Abstract Class
 *
 * Defines the contract for all LLM metadata extraction providers
 * and implements common functionality
 */

import type {
  LlmExtractionRequest,
  LlmExtractionResult,
  ProviderHealthStatus,
  LlmMetadataResponse,
  ConfidenceScores,
  ExtractedMetadata,
} from './types';

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseProvider {
  protected maxRetries = 3;
  protected retryDelayMs = 1000;

  /**
   * Get provider identifier (e.g., 'ollama:llama3.2')
   */
  abstract getName(): string;

  /**
   * Check if provider is available and healthy
   */
  abstract checkHealth(): Promise<ProviderHealthStatus>;

  /**
   * Extract metadata from content (implemented by provider)
   */
  protected abstract callLlm(
    prompt: string,
    request: LlmExtractionRequest
  ): Promise<{ text: string; tokensUsed?: number }>;

  /**
   * Main extraction method with retry logic and validation
   */
  async extractMetadata(
    prompt: string,
    request: LlmExtractionRequest
  ): Promise<LlmExtractionResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Try with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Call the LLM
        const response = await this.callLlm(prompt, request);

        // Parse and validate response
        const parsed = this.parseResponse(response.text);
        const validated = this.validateResponse(parsed);

        if (!validated.valid) {
          throw new Error(`Invalid response: ${validated.errors.join(', ')}`);
        }

        // Calculate confidence scores
        const confidence = this.calculateConfidence(parsed);

        // Build result
        const metadata: ExtractedMetadata = {
          itemType: parsed.itemType,
          title: parsed.title,
          creators: parsed.creators,
          date: parsed.date,
        };

        const processingTimeMs = Date.now() - startTime;

        return {
          success: true,
          metadata,
          confidence,
          providerUsed: this.getName(),
          tokensUsed: response.tokensUsed,
          processingTimeMs,
          extractionNotes: parsed.extractionNotes,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Log retry attempt
        if (attempt < this.maxRetries) {
          console.log(
            `[${this.getName()}] Extraction attempt ${attempt} failed, retrying in ${this.retryDelayMs}ms...`
          );
          await this.delay(this.retryDelayMs * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    const processingTimeMs = Date.now() - startTime;
    return {
      success: false,
      confidence: {},
      providerUsed: this.getName(),
      processingTimeMs,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Parse LLM response text into structured format
   */
  protected parseResponse(responseText: string): LlmMetadataResponse {
    // Try to extract JSON from response
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    jsonText = jsonText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    // Try to find JSON object in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonText);
      return parsed as LlmMetadataResponse;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate parsed response
   */
  protected validateResponse(response: LlmMetadataResponse): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check that we have at least some metadata
    if (!response.itemType && !response.title && !response.creators && !response.date) {
      errors.push('Response contains no metadata fields');
    }

    // Validate itemType if present
    if (response.itemType) {
      const validTypes = [
        'journalArticle',
        'conferencePaper',
        'book',
        'bookSection',
        'blogPost',
        'webpage',
        'videoRecording',
        'podcast',
        'thesis',
        'report',
        'preprint',
        'magazineArticle',
        'newspaperArticle',
      ];
      if (!validTypes.includes(response.itemType)) {
        errors.push(`Invalid itemType: ${response.itemType}`);
      }
    }

    // Validate creators if present
    if (response.creators) {
      if (!Array.isArray(response.creators)) {
        errors.push('creators must be an array');
      } else {
        for (let i = 0; i < response.creators.length; i++) {
          const creator = response.creators[i];
          if (!creator.creatorType) {
            errors.push(`Creator ${i} missing creatorType`);
          }
          if (!creator.firstName && !creator.lastName && !creator.name) {
            errors.push(`Creator ${i} has no name fields`);
          }
        }
      }
    }

    // Validate date format if present
    if (response.date) {
      // Should be YYYY-MM-DD or YYYY
      if (!/^\d{4}(-\d{2}-\d{2})?$/.test(response.date)) {
        errors.push(`Invalid date format: ${response.date} (expected YYYY or YYYY-MM-DD)`);
      }
    }

    // Validate confidence scores if present
    if (response.confidence) {
      for (const [field, score] of Object.entries(response.confidence)) {
        if (typeof score !== 'number' || score < 0 || score > 1) {
          errors.push(`Invalid confidence score for ${field}: ${score}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate overall confidence scores
   */
  protected calculateConfidence(response: LlmMetadataResponse): ConfidenceScores {
    const confidence: ConfidenceScores = {
      itemType: response.confidence?.itemType,
      title: response.confidence?.title,
      creators: response.confidence?.creators,
      date: response.confidence?.date,
    };

    // Calculate overall confidence (average of available scores)
    const scores = Object.values(confidence).filter((s): s is number => s !== undefined);
    if (scores.length > 0) {
      confidence.overall = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }

    return confidence;
  }

  /**
   * Delay helper for retries
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout wrapper for async operations
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }
}
