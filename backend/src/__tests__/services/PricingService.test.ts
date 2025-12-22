import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pricingService } from '../../services/PricingService.js';

describe('PricingService', () => {
  beforeEach(() => {
    // Clear cache before each test
    pricingService.clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCacheStats', () => {
    it('should return empty cache stats initially', () => {
      const stats = pricingService.getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.validEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.circuitBreakerStatus).toBe('CLOSED');
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('circuit breaker', () => {
    it('should start with circuit breaker closed', () => {
      expect(pricingService.isCircuitOpen()).toBe(false);
    });

    it('should open circuit breaker after threshold failures', () => {
      // Record 5 failures (threshold)
      for (let i = 0; i < 5; i++) {
        pricingService.recordFailure();
      }

      expect(pricingService.isCircuitOpen()).toBe(true);
    });

    it('should reset circuit breaker after timeout', () => {
      // Record failures to open circuit
      for (let i = 0; i < 5; i++) {
        pricingService.recordFailure();
      }

      expect(pricingService.isCircuitOpen()).toBe(true);

      // Advance time past the reset period (60 seconds)
      vi.advanceTimersByTime(61000);

      expect(pricingService.isCircuitOpen()).toBe(false);
    });

    it('should reset failure count on success', () => {
      // Record some failures
      pricingService.recordFailure();
      pricingService.recordFailure();

      // Record success
      pricingService.recordSuccess();

      // Should be able to have 5 more failures before circuit opens
      for (let i = 0; i < 4; i++) {
        pricingService.recordFailure();
      }

      expect(pricingService.isCircuitOpen()).toBe(false);
    });
  });

  describe('cache operations', () => {
    it('should return null for non-cached ticker', () => {
      const cached = pricingService.getCachedPrice('AAPL');
      expect(cached).toBeNull();
    });

    it('should cache and retrieve price data', () => {
      const mockPrice = {
        ticker: 'AAPL',
        price: 150.00,
        currency: 'USD',
        name: 'Apple Inc.',
        shortName: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        exchange: 'NASDAQ',
        change: 2.50,
        changePercent: 1.69,
        cached: false,
        timestamp: Date.now()
      };

      pricingService.setCachedPrice('AAPL', mockPrice);

      const cached = pricingService.getCachedPrice('AAPL');

      expect(cached).not.toBeNull();
      expect(cached?.price).toBe(150.00);
      expect(cached?.ticker).toBe('AAPL');
    });

    it('should expire cache after TTL', () => {
      const mockPrice = {
        ticker: 'AAPL',
        price: 150.00,
        currency: 'USD',
        name: 'Apple Inc.',
        shortName: 'AAPL',
        sector: null,
        industry: null,
        exchange: 'NASDAQ',
        change: 0,
        changePercent: 0,
        cached: false,
        timestamp: Date.now()
      };

      pricingService.setCachedPrice('AAPL', mockPrice);

      // Advance time past cache TTL (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const cached = pricingService.getCachedPrice('AAPL');
      expect(cached).toBeNull();
    });

    it('should clear all cached prices', () => {
      pricingService.setCachedPrice('AAPL', { ticker: 'AAPL', price: 150, currency: 'USD', name: 'Apple', shortName: 'AAPL', sector: null, industry: null, exchange: 'NASDAQ', change: 0, changePercent: 0, cached: false, timestamp: Date.now() });
      pricingService.setCachedPrice('GOOGL', { ticker: 'GOOGL', price: 140, currency: 'USD', name: 'Google', shortName: 'GOOGL', sector: null, industry: null, exchange: 'NASDAQ', change: 0, changePercent: 0, cached: false, timestamp: Date.now() });

      pricingService.clearCache();

      expect(pricingService.getCachedPrice('AAPL')).toBeNull();
      expect(pricingService.getCachedPrice('GOOGL')).toBeNull();
    });
  });
});
