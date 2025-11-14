/**
 * LLM Metadata Extractor
 *
 * Main orchestrator for LLM-based bibliographic metadata extraction
 */

import { getLlmConfig, validateConfig, getConfigSetupInstructions } from '../../config/llm-config';
import { getProviderRegistry } from './provider-registry';
import { preprocessTextForLlm } from './text-preprocessor';
import { buildMetadataExtractionPrompt } from './prompts/metadata-extraction-prompt';
import type { LlmExtractionRequest, LlmExtractionResult } from './providers/types';

/**
 * Extract metadata using LLM
 */
export async function extractMetadataWithLlm(
  request: LlmExtractionRequest
): Promise<LlmExtractionResult> {
  const startTime = Date.now();

  // Load and validate configuration
  const config = getLlmConfig();
  const validation = validateConfig(config);

  if (!validation.valid) {
    const instructions = getConfigSetupInstructions(validation.errors);
    return {
      success: false,
      confidence: {},
      providerUsed: 'none',
      processingTimeMs: Date.now() - startTime,
      error: `LLM extraction not configured:\n${instructions}`,
    };
  }

  // Check if disabled
  if (config.provider === 'none') {
    return {
      success: false,
      confidence: {},
      providerUsed: 'none',
      processingTimeMs: Date.now() - startTime,
      error: 'LLM extraction is disabled (LLM_PROVIDER=none)',
    };
  }

  // Preprocess text
  const preprocessedText = preprocessTextForLlm(
    request.text,
    request.contentType,
    config.extraction.maxInputChars
  );

  // Update request with preprocessed text
  const processedRequest: LlmExtractionRequest = {
    ...request,
    text: preprocessedText,
  };

  // Get best available provider
  const registry = getProviderRegistry();
  const provider = await registry.getBestProvider();

  if (!provider) {
    // No providers available
    const healthStatus = await registry.checkAllProvidersHealth();
    const errors: string[] = [];

    for (const [name, status] of healthStatus.entries()) {
      if (!status.available) {
        errors.push(`${name}: ${status.error || 'unavailable'}`);
      }
    }

    return {
      success: false,
      confidence: {},
      providerUsed: 'none',
      processingTimeMs: Date.now() - startTime,
      error: `No LLM providers available:\n${errors.join('\n')}`,
    };
  }

  // Build prompt
  const prompt = buildMetadataExtractionPrompt(processedRequest);

  console.log(`[LLM Extractor] Using provider: ${provider.getName()}`);
  console.log(`[LLM Extractor] Input text length: ${preprocessedText.length} chars`);

  // Extract metadata
  try {
    const result = await provider.extractMetadata(prompt, processedRequest);

    console.log(`[LLM Extractor] Extraction ${result.success ? 'succeeded' : 'failed'}`);
    if (result.tokensUsed) {
      console.log(`[LLM Extractor] Tokens used: ${result.tokensUsed}`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[LLM Extractor] Extraction error:`, errorMessage);

    return {
      success: false,
      confidence: {},
      providerUsed: provider.getName(),
      processingTimeMs: Date.now() - startTime,
      error: `Extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Check if LLM extraction is available
 */
export async function isLlmExtractionAvailable(): Promise<boolean> {
  const config = getLlmConfig();

  if (config.provider === 'none') {
    return false;
  }

  const validation = validateConfig(config);
  if (!validation.valid) {
    return false;
  }

  const registry = getProviderRegistry();
  const provider = await registry.getBestProvider();

  return provider !== null;
}

/**
 * Get available providers
 */
export async function getAvailableProviders(): Promise<string[]> {
  const registry = getProviderRegistry();
  return registry.getAvailableProviders();
}

/**
 * Get provider health status
 */
export async function getProvidersHealthStatus(): Promise<
  Map<string, { available: boolean; error?: string }>
> {
  const registry = getProviderRegistry();
  return registry.checkAllProvidersHealth();
}
