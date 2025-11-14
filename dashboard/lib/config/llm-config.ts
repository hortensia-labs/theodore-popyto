/**
 * LLM Configuration Management
 *
 * Centralizes configuration for LLM metadata extraction providers
 */

export interface LlmConfig {
  provider: 'auto' | 'ollama' | 'anthropic' | 'none';
  fallbackChain: ('ollama' | 'anthropic')[];

  ollama: {
    endpoint: string;
    model: string;
    timeout: number;
  };

  anthropic: {
    apiKey?: string;
    model: string;
    timeout: number;
  };

  extraction: {
    maxInputChars: number;
    temperature: number;
    maxTokens: number;
    cacheEnabled: boolean;
  };
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  provider: 'auto' as const,
  fallbackChain: ['ollama', 'anthropic'] as const,

  ollama: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.2',
    timeout: 30000,
  },

  anthropic: {
    model: 'claude-3-5-haiku-20241022',
    timeout: 30000,
  },

  extraction: {
    maxInputChars: 8000,
    temperature: 0.1,
    maxTokens: 1000,
    cacheEnabled: true,
  },
};

/**
 * Get LLM configuration from environment variables
 */
export function getLlmConfig(): LlmConfig {
  // Parse provider
  const provider = (process.env.LLM_PROVIDER || DEFAULTS.provider) as LlmConfig['provider'];

  // Parse fallback chain
  const fallbackChainStr = process.env.LLM_FALLBACK_CHAIN || DEFAULTS.fallbackChain.join(',');
  const fallbackChain = fallbackChainStr
    .split(',')
    .map(p => p.trim())
    .filter(p => p === 'ollama' || p === 'anthropic') as ('ollama' | 'anthropic')[];

  // Ollama configuration
  const ollama = {
    endpoint: process.env.OLLAMA_ENDPOINT || DEFAULTS.ollama.endpoint,
    model: process.env.OLLAMA_MODEL || DEFAULTS.ollama.model,
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || String(DEFAULTS.ollama.timeout), 10),
  };

  // Anthropic configuration
  const anthropic = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || DEFAULTS.anthropic.model,
    timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || String(DEFAULTS.anthropic.timeout), 10),
  };

  // Extraction settings
  const extraction = {
    maxInputChars: parseInt(
      process.env.LLM_MAX_INPUT_CHARS || String(DEFAULTS.extraction.maxInputChars),
      10
    ),
    temperature: parseFloat(
      process.env.LLM_TEMPERATURE || String(DEFAULTS.extraction.temperature)
    ),
    maxTokens: parseInt(
      process.env.LLM_MAX_TOKENS || String(DEFAULTS.extraction.maxTokens),
      10
    ),
    cacheEnabled: process.env.LLM_CACHE_ENABLED !== 'false',
  };

  return {
    provider,
    fallbackChain,
    ollama,
    anthropic,
    extraction,
  };
}

/**
 * Validate configuration based on active providers
 */
export function validateConfig(config: LlmConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // If provider is 'none', skip validation
  if (config.provider === 'none') {
    return { valid: true, errors: [] };
  }

  // Validate Ollama config if in fallback chain
  if (config.fallbackChain.includes('ollama')) {
    if (!config.ollama.endpoint) {
      errors.push('OLLAMA_ENDPOINT is required when Ollama is in fallback chain');
    }
    if (!config.ollama.model) {
      errors.push('OLLAMA_MODEL is required when Ollama is in fallback chain');
    }
    try {
      new URL(config.ollama.endpoint);
    } catch {
      errors.push(`OLLAMA_ENDPOINT is not a valid URL: ${config.ollama.endpoint}`);
    }
  }

  // Validate Anthropic config if in fallback chain
  if (config.fallbackChain.includes('anthropic')) {
    if (!config.anthropic.apiKey) {
      errors.push('ANTHROPIC_API_KEY is required when Anthropic is in fallback chain');
    }
    if (config.anthropic.apiKey && !config.anthropic.apiKey.startsWith('sk-ant-')) {
      errors.push('ANTHROPIC_API_KEY appears to be invalid (should start with sk-ant-)');
    }
  }

  // Validate extraction settings
  if (config.extraction.maxInputChars < 1000) {
    errors.push('LLM_MAX_INPUT_CHARS should be at least 1000');
  }
  if (config.extraction.temperature < 0 || config.extraction.temperature > 1) {
    errors.push('LLM_TEMPERATURE should be between 0 and 1');
  }
  if (config.extraction.maxTokens < 100) {
    errors.push('LLM_MAX_TOKENS should be at least 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a specific provider is configured
 */
export function isProviderConfigured(
  provider: 'ollama' | 'anthropic',
  config: LlmConfig
): boolean {
  if (provider === 'ollama') {
    return !!(config.ollama.endpoint && config.ollama.model);
  }

  if (provider === 'anthropic') {
    return !!(config.anthropic.apiKey && config.anthropic.model);
  }

  return false;
}

/**
 * Get configuration errors as user-friendly messages
 */
export function getConfigSetupInstructions(errors: string[]): string {
  if (errors.length === 0) {
    return '';
  }

  const instructions: string[] = [
    'LLM metadata extraction is not properly configured:',
    '',
  ];

  for (const error of errors) {
    instructions.push(`  • ${error}`);
  }

  instructions.push('');
  instructions.push('To configure LLM extraction, add to your .env file:');
  instructions.push('');
  instructions.push('For Ollama (local):');
  instructions.push('  LLM_PROVIDER=ollama');
  instructions.push('  OLLAMA_ENDPOINT=http://localhost:11434');
  instructions.push('  OLLAMA_MODEL=llama3.2');
  instructions.push('');
  instructions.push('For Claude (API):');
  instructions.push('  LLM_PROVIDER=anthropic');
  instructions.push('  ANTHROPIC_API_KEY=sk-ant-...');
  instructions.push('');
  instructions.push('For both (Ollama first, Claude fallback):');
  instructions.push('  LLM_PROVIDER=auto');
  instructions.push('  LLM_FALLBACK_CHAIN=ollama,anthropic');
  instructions.push('  ANTHROPIC_API_KEY=sk-ant-...');

  return instructions.join('\n');
}
