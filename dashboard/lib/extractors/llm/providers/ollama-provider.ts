/**
 * Ollama Provider
 *
 * Integrates with local Ollama instance for metadata extraction
 */

import { BaseProvider } from './base-provider';
import type { LlmExtractionRequest, ProviderHealthStatus } from './types';

export interface OllamaConfig {
  endpoint: string;
  model: string;
  timeout: number;
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseProvider {
  constructor(private config: OllamaConfig) {
    super();
  }

  getName(): string {
    return `ollama:${this.config.model}`;
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Check if Ollama is running by listing models
      const response = await this.withTimeout(
        fetch(`${this.config.endpoint}/api/tags`),
        5000,
        'Ollama health check timed out'
      );

      if (!response.ok) {
        return {
          available: false,
          checkedAt: new Date(),
          error: `Ollama returned status ${response.status}`,
          responseTimeMs: Date.now() - startTime,
        };
      }

      const data: OllamaTagsResponse = await response.json();

      // Check if configured model is available
      const modelExists = data.models.some(m => m.name === this.config.model);

      if (!modelExists) {
        return {
          available: false,
          checkedAt: new Date(),
          error: `Model '${this.config.model}' not found. Available models: ${data.models.map(m => m.name).join(', ')}. Run: ollama pull ${this.config.model}`,
          responseTimeMs: Date.now() - startTime,
        };
      }

      return {
        available: true,
        checkedAt: new Date(),
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide helpful error messages
      let helpfulError = errorMessage;
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        helpfulError = `Cannot connect to Ollama at ${this.config.endpoint}. Is Ollama running? Start it with: ollama serve`;
      }

      return {
        available: false,
        checkedAt: new Date(),
        error: helpfulError,
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  protected async callLlm(
    prompt: string,
    request: LlmExtractionRequest
  ): Promise<{ text: string; tokensUsed?: number }> {
    const requestBody: OllamaGenerateRequest = {
      model: this.config.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 1000,
      },
    };

    try {
      const response = await this.withTimeout(
        fetch(`${this.config.endpoint}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }),
        this.config.timeout,
        `Ollama request timed out after ${this.config.timeout}ms`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data: OllamaGenerateResponse = await response.json();

      // Calculate token usage from eval counts
      const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);

      return {
        text: data.response,
        tokensUsed: tokensUsed > 0 ? tokensUsed : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new Error(
          `Request timed out. Try reducing LLM_MAX_INPUT_CHARS or using a faster model.`
        );
      }
      throw error;
    }
  }
}
