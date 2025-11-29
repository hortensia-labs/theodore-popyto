/**
 * Domain-Based Rate Limiter
 * 
 * Implements token bucket algorithm for rate limiting HTTP requests
 * per domain
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface RateLimitConfig {
  tokensPerSecond: number;
  maxBurst?: number;
}

export class DomainRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private defaultConfig: RateLimitConfig;
  private domainConfigs: Map<string, RateLimitConfig> = new Map();
  
  constructor(defaultTokensPerSecond: number = 1) {
    this.defaultConfig = {
      tokensPerSecond: defaultTokensPerSecond,
      maxBurst: defaultTokensPerSecond * 2, // Allow burst of 2x
    };
    
    // Set trusted domain configs
    this.setTrustedDomains();
  }
  
  /**
   * Set configurations for trusted domains
   */
  private setTrustedDomains(): void {
    const trustedDomains = [
      'arxiv.org',
      'ncbi.nlm.nih.gov',
      'pubmed.ncbi.nlm.nih.gov',
      'doi.org',
      'dx.doi.org',
    ];

    trustedDomains.forEach(domain => {
      this.domainConfigs.set(domain, {
        tokensPerSecond: 2,
        maxBurst: 4,
      });
    });

    // Semantic Scholar API rate limiting
    // API is very restrictive: ~30-50 requests per 5 minutes in practice
    // That's approximately 0.1-0.17 req/sec
    // We use 0.5 req/sec (1 request every 2 seconds) for safety
    // This is conservative but ensures we don't hit rate limits
    this.domainConfigs.set('api.semanticscholar.org', {
      tokensPerSecond: 0.5,  // 1 request every 2 seconds
      maxBurst: 1,           // No bursts - strictly sequential
    });
  }
  
  /**
   * Set rate limit for specific domain
   */
  setDomainLimit(domain: string, tokensPerSecond: number, maxBurst?: number): void {
    this.domainConfigs.set(domain, {
      tokensPerSecond,
      maxBurst: maxBurst || tokensPerSecond * 2,
    });
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }
  
  /**
   * Get or create bucket for domain
   */
  private getBucket(domain: string): TokenBucket {
    let bucket = this.buckets.get(domain);
    
    if (!bucket) {
      const config = this.domainConfigs.get(domain) || this.defaultConfig;
      bucket = {
        tokens: config.maxBurst || config.tokensPerSecond,
        lastRefill: Date.now(),
        maxTokens: config.maxBurst || config.tokensPerSecond,
        refillRate: config.tokensPerSecond,
      };
      this.buckets.set(domain, bucket);
    }
    
    return bucket;
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    
    const tokensToAdd = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
  
  /**
   * Wait for a token to become available
   */
  async waitForToken(url: string): Promise<void> {
    const domain = this.extractDomain(url);
    const bucket = this.getBucket(domain);
    
    while (true) {
      this.refillBucket(bucket);
      
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return;
      }
      
      // Calculate wait time for next token
      const waitTime = (1 - bucket.tokens) / bucket.refillRate * 1000;
      await sleep(Math.max(100, Math.min(waitTime, 5000))); // Wait 100ms to 5s
    }
  }
  
  /**
   * Execute function with rate limiting
   */
  async executeWithRateLimit<T>(
    url: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.waitForToken(url);
    return await fn();
  }
  
  /**
   * Check if token is available (non-blocking)
   */
  hasTokenAvailable(url: string): boolean {
    const domain = this.extractDomain(url);
    const bucket = this.getBucket(domain);
    this.refillBucket(bucket);
    return bucket.tokens >= 1;
  }
  
  /**
   * Get current token count for domain
   */
  getTokenCount(url: string): number {
    const domain = this.extractDomain(url);
    const bucket = this.getBucket(domain);
    this.refillBucket(bucket);
    return bucket.tokens;
  }
  
  /**
   * Reset all buckets
   */
  reset(): void {
    this.buckets.clear();
  }
  
  /**
   * Get stats for all domains
   */
  getStats(): Record<string, { tokens: number; maxTokens: number; refillRate: number }> {
    const stats: Record<string, { tokens: number; maxTokens: number; refillRate: number }> = {};
    
    this.buckets.forEach((bucket, domain) => {
      this.refillBucket(bucket);
      stats[domain] = {
        tokens: bucket.tokens,
        maxTokens: bucket.maxTokens,
        refillRate: bucket.refillRate,
      };
    });
    
    return stats;
  }
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global rate limiter instance
export const globalRateLimiter = new DomainRateLimiter(
  parseInt(process.env.RATE_LIMIT_DEFAULT_PER_SECOND || '1', 10)
);

