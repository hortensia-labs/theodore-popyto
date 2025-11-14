/**
 * Provider Registry
 *
 * Manages provider initialization, health checking, and selection
 */

import { getLlmConfig, type LlmConfig } from '../../config/llm-config';
import { BaseProvider } from './providers/base-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import type { ProviderHealthStatus } from './providers/types';

/**
 * Health check cache entry
 */
interface HealthCacheEntry {
  status: ProviderHealthStatus;
  expiresAt: number;
}

/**
 * Provider registry class
 */
export class ProviderRegistry {
  private providers: Map<string, BaseProvider> = new Map();
  private healthCache: Map<string, HealthCacheEntry> = new Map();
  private config: LlmConfig;

  // Cache TTL (5 minutes for Ollama, 1 hour for Anthropic)
  private readonly OLLAMA_CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly ANTHROPIC_CACHE_TTL_MS = 60 * 60 * 1000;

  constructor(config?: LlmConfig) {
    this.config = config || getLlmConfig();
    this.initializeProviders();
  }

  /**
   * Initialize providers based on configuration
   */
  private initializeProviders(): void {
    // Initialize Ollama if in fallback chain
    if (this.config.fallbackChain.includes('ollama')) {
      const ollamaProvider = new OllamaProvider({
        endpoint: this.config.ollama.endpoint,
        model: this.config.ollama.model,
        timeout: this.config.ollama.timeout,
      });
      this.providers.set('ollama', ollamaProvider);
    }

    // Initialize Anthropic if in fallback chain and has API key
    if (this.config.fallbackChain.includes('anthropic') && this.config.anthropic.apiKey) {
      const anthropicProvider = new AnthropicProvider({
        apiKey: this.config.anthropic.apiKey,
        model: this.config.anthropic.model,
        timeout: this.config.anthropic.timeout,
      });
      this.providers.set('anthropic', anthropicProvider);
    }
  }

  /**
   * Get best available provider from fallback chain
   */
  async getBestProvider(): Promise<BaseProvider | null> {
    // Try providers in fallback chain order
    for (const providerName of this.config.fallbackChain) {
      const provider = this.providers.get(providerName);
      if (!provider) {
        console.log(`[ProviderRegistry] Provider '${providerName}' not initialized`);
        continue;
      }

      // Check health (with caching)
      const health = await this.checkProviderHealth(providerName, provider);

      if (health.available) {
        console.log(`[ProviderRegistry] Selected provider: ${provider.getName()}`);
        return provider;
      } else {
        console.log(
          `[ProviderRegistry] Provider '${providerName}' unavailable: ${health.error}`
        );
      }
    }

    // No providers available
    return null;
  }

  /**
   * Check provider health with caching
   */
  private async checkProviderHealth(
    providerName: string,
    provider: BaseProvider
  ): Promise<ProviderHealthStatus> {
    // Check cache first
    const cached = this.healthCache.get(providerName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.status;
    }

    // Perform health check
    const status = await provider.checkHealth();

    // Cache the result
    const ttl =
      providerName === 'ollama' ? this.OLLAMA_CACHE_TTL_MS : this.ANTHROPIC_CACHE_TTL_MS;
    this.healthCache.set(providerName, {
      status,
      expiresAt: Date.now() + ttl,
    });

    return status;
  }

  /**
   * Check all providers' health status
   */
  async checkAllProvidersHealth(): Promise<Map<string, ProviderHealthStatus>> {
    const results = new Map<string, ProviderHealthStatus>();

    for (const [name, provider] of this.providers.entries()) {
      const health = await this.checkProviderHealth(name, provider);
      results.set(name, health);
    }

    return results;
  }

  /**
   * Get all initialized providers
   */
  getProviders(): Map<string, BaseProvider> {
    return this.providers;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): BaseProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Clear health cache (useful for testing or forcing refresh)
   */
  clearHealthCache(): void {
    this.healthCache.clear();
  }

  /**
   * Get available provider names
   */
  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];

    for (const [name, provider] of this.providers.entries()) {
      const health = await this.checkProviderHealth(name, provider);
      if (health.available) {
        available.push(provider.getName());
      }
    }

    return available;
  }
}

/**
 * Singleton instance
 */
let registryInstance: ProviderRegistry | null = null;

/**
 * Get or create provider registry instance
 */
export function getProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

/**
 * Reset provider registry (useful for testing or config changes)
 */
export function resetProviderRegistry(): void {
  registryInstance = null;
}
