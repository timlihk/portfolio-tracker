import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { currencyService } from '../../services/CurrencyService.js';

describe('CurrencyService', () => {
  beforeEach(() => {
    currencyService.clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCacheStats', () => {
    it('should return empty cache stats initially', () => {
      const stats = currencyService.getCacheStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.validEntries).toBe(0);
      expect(stats.circuitBreakerStatus).toBe('CLOSED');
    });
  });

  describe('circuit breaker', () => {
    it('should start with circuit breaker closed', () => {
      expect(currencyService.isCircuitOpen()).toBe(false);
    });

    it('should open circuit breaker after threshold failures', () => {
      // Record 3 failures (currency service threshold)
      for (let i = 0; i < 3; i++) {
        currencyService.recordFailure();
      }

      expect(currencyService.isCircuitOpen()).toBe(true);
    });
  });

  describe('convert', () => {
    it('should return same amount when converting to same currency', async () => {
      const result = await currencyService.convert(100, 'USD', 'USD');

      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1.0);
    });
  });

  describe('convertToUSD', () => {
    it('should return same amount for USD input', async () => {
      const result = await currencyService.convertToUSD(100, 'USD');

      expect(result.originalAmount).toBe(100);
      expect(result.usdAmount).toBe(100);
      expect(result.exchangeRate).toBe(1.0);
    });
  });

  describe('fallback rates', () => {
    it('should have fallback rates for common currencies', async () => {
      const currencies = await currencyService.getSupportedCurrencies();

      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');
      expect(currencies).toContain('JPY');
    });
  });

  describe('cache operations', () => {
    it('should clear cache', () => {
      currencyService.clearCache();
      const stats = currencyService.getCacheStats();

      expect(stats.totalEntries).toBe(0);
    });
  });
});
