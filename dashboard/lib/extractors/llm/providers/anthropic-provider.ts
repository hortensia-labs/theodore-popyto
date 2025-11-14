/**
 * Anthropic Provider
 *
 * Integrates with Anthropic Claude API for metadata extraction
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base-provider';
import type { LlmExtractionRequest, ProviderHealthStatus } from './types';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  timeout: number;
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(private config: AnthropicConfig) {
    super();
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  getName(): string {
    return `anthropic:${this.config.model}`;
  }

  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Validate API key format
      if (!this.config.apiKey.startsWith('sk-ant-')) {
        return {
          available: false,
          checkedAt: new Date(),
          error: 'Invalid API key format (should start with sk-ant-)',
          responseTimeMs: 0,
        };
      }

      // Make a minimal API call to verify key works
      // Using a very short message to minimize cost
      try {
        await this.withTimeout(
          this.client.messages.create({
            model: this.config.model,
            max_tokens: 10,
            messages: [
              {
                role: 'user',
                content: 'Hi',
              },
            ],
          }),
          5000,
          'Anthropic health check timed out'
        );

        return {
          available: true,
          checkedAt: new Date(),
          responseTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        // Handle Anthropic-specific errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status?: number }).status;
          if (status === 401) {
            return {
              available: false,
              checkedAt: new Date(),
              error: 'Invalid API key. Get your key at https://console.anthropic.com/settings/keys',
              responseTimeMs: Date.now() - startTime,
            };
          }
          if (status === 429) {
            return {
              available: false,
              checkedAt: new Date(),
              error: 'Rate limit exceeded. Please try again later.',
              responseTimeMs: Date.now() - startTime,
            };
          }
        }
        throw error; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        checkedAt: new Date(),
        error: `Anthropic API error: ${errorMessage}`,
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  protected async callLlm(
    prompt: string,
    request: LlmExtractionRequest
  ): Promise<{ text: string; tokensUsed?: number }> {
    try {
      const response = await this.withTimeout(
        this.client.messages.create({
          model: this.config.model,
          max_tokens: 1000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
            // Prefill the assistant response to force JSON output
            {
              role: 'assistant',
              content: '{"itemType":',
            },
          ],
        }),
        this.config.timeout,
        `Anthropic request timed out after ${this.config.timeout}ms`
      );

      // Extract text from response
      let text = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          text += block.text;
        }
      }

      // Prepend the prefilled part to make valid JSON
      text = '{"itemType":' + text;

      // Calculate token usage
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      return {
        text,
        tokensUsed,
      };
    } catch (error) {
      // Handle rate limiting
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status?: number }).status;
        if (status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (status === 529) {
          throw new Error('Anthropic API is temporarily overloaded. Please try again.');
        }
      }

      if (error instanceof Error && error.message.includes('timed out')) {
        throw new Error(
          `Request timed out. Try reducing LLM_MAX_INPUT_CHARS or checking your network connection.`
        );
      }

      throw error;
    }
  }
}
