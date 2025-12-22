/**
 * Currency Conversion Service
 * Converts prices between currencies using exchangerate-api.com
 */
import logger from './logger.js';
import type { CurrencyConversion } from '../types/index.js';

interface CachedRate {
  rates: Record<string, number>;
  timestamp: number;
}

interface ExchangeRateAPIResponse {
  rates: Record<string, number>;
}

interface CurrencyConversionToUSD extends CurrencyConversion {
  usdAmount: number;
}

interface CurrencyConversionBetween extends CurrencyConversion {
  convertedAmount: number;
  targetCurrency: string;
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheTTL: number;
  circuitBreakerStatus: 'OPEN' | 'CLOSED';
  failureCount: number;
}

class CurrencyService {
  private rateCache: Map<string, CachedRate>;
  private readonly CACHE_TTL: number;
  private readonly fallbackRates: Record<string, number>;
  private failureCount: number;
  private lastFailure: number | null;
  private readonly CIRCUIT_BREAKER_THRESHOLD: number;
  private readonly CIRCUIT_BREAKER_RESET: number;

  constructor() {
    // Cache for exchange rates (10 minute TTL)
    this.rateCache = new Map<string, CachedRate>();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    // Fallback rates in case API fails
    this.fallbackRates = {
      'EUR': 1.10,
      'GBP': 1.27,
      'JPY': 0.0067,
      'CAD': 0.74,
      'AUD': 0.66,
      'CHF': 1.12,
      'CNY': 0.14,
      'HKD': 0.128,
      'SGD': 0.74,
      'INR': 0.012,
      'KRW': 0.00075,
      'TWD': 0.031,
      'NZD': 0.61,
      'SEK': 0.095,
      'NOK': 0.092,
      'DKK': 0.15,
      'MXN': 0.058,
      'BRL': 0.20,
      'ZAR': 0.055,
      'RUB': 0.011,
      'USD': 1.0
    };

    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailure = null;
    this.CIRCUIT_BREAKER_THRESHOLD = 3;
    this.CIRCUIT_BREAKER_RESET = 60 * 1000; // 1 minute
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - (this.lastFailure ?? 0);
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_RESET) {
        return true;
      }
      this.failureCount = 0;
    }
    return false;
  }

  /**
   * Record a failure
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();
  }

  /**
   * Record a success
   */
  private recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Get cached rate if valid
   */
  private getCachedRate(fromCurrency: string): CachedRate | null {
    const cached = this.rateCache.get(fromCurrency.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Set rate in cache
   */
  private setCachedRate(fromCurrency: string, data: { rates: Record<string, number> }): void {
    this.rateCache.set(fromCurrency.toUpperCase(), {
      ...data,
      timestamp: Date.now()
    });
  }

  private buildFallbackRates(baseCurrency: string): Record<string, number> {
    const upperBase = baseCurrency.toUpperCase();
    // If base is USD, return the fallback map directly
    if (upperBase === 'USD') {
      return this.fallbackRates;
    }

    const baseToUsd = this.fallbackRates[upperBase];
    if (!baseToUsd) {
      // If we don't have a fallback for the requested base, fall back to USD rates
      return this.fallbackRates;
    }

    const derived: Record<string, number> = { [upperBase]: 1, USD: baseToUsd };

    // Derive cross rates using USD as the pivot: rate(base -> target) = (USD/base) / (USD/target)
    for (const [currency, usdPerCurrency] of Object.entries(this.fallbackRates)) {
      const upperCurrency = currency.toUpperCase();
      if (upperCurrency === upperBase) continue;

      // usdPerCurrency is USD per 1 currency unit
      const baseToTarget = baseToUsd / usdPerCurrency;
      derived[upperCurrency] = baseToTarget;
    }

    return derived;
  }

  /**
   * Fetch exchange rates from API
   * @param baseCurrency - Base currency code
   * @returns Exchange rates
   */
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    const upperCurrency = baseCurrency.toUpperCase();

    // Check cache first
    const cached = this.getCachedRate(upperCurrency);
    if (cached) {
      logger.debug(`Cache hit for ${upperCurrency} rates`);
      return cached.rates;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      logger.warn(`Currency API circuit breaker open, using fallback rates`);
      return this.fallbackRates;
    }

    try {
      logger.info(`Fetching exchange rates for ${upperCurrency}`);

      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${upperCurrency}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json() as ExchangeRateAPIResponse;

      if (!data.rates) {
        throw new Error('Invalid response from exchange rate API');
      }

      // Cache the rates
      this.setCachedRate(upperCurrency, { rates: data.rates });
      this.recordSuccess();

      logger.info(`Got exchange rates for ${upperCurrency}`);
      return data.rates;

    } catch (error) {
      this.recordFailure();
      const err = error as Error;
      logger.error(`Error fetching exchange rates`, { error: err.message, currency: upperCurrency });
      logger.warn(`Using fallback rates`, { currency: upperCurrency });
      return this.buildFallbackRates(upperCurrency);
    }
  }

  /**
   * Convert amount from one currency to USD
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency code
   * @returns Conversion result
   */
  async convertToUSD(amount: number, fromCurrency: string): Promise<CurrencyConversionToUSD> {
    const upperCurrency = fromCurrency.toUpperCase();

    if (upperCurrency === 'USD') {
      return {
        originalAmount: amount,
        originalCurrency: 'USD',
        usdAmount: amount,
        exchangeRate: 1.0,
        timestamp: Date.now()
      };
    }

    try {
      // Get rates with base = fromCurrency
      const rates = await this.fetchExchangeRates(upperCurrency);
      const usdRate = rates['USD'] ?? rates['usd'];

      if (!usdRate) {
        // Try reverse lookup
        const usdRates = await this.fetchExchangeRates('USD');
        const fromRate = usdRates[upperCurrency];
        if (fromRate) {
          const usdAmount = amount / fromRate;
          return {
            originalAmount: amount,
            originalCurrency: upperCurrency,
            usdAmount: Math.round(usdAmount * 100) / 100,
            exchangeRate: 1 / fromRate,
            timestamp: Date.now()
          };
        }
        throw new Error(`No exchange rate found for ${upperCurrency}`);
      }

      const usdAmount = amount * usdRate;

      return {
        originalAmount: amount,
        originalCurrency: upperCurrency,
        usdAmount: Math.round(usdAmount * 100) / 100,
        exchangeRate: usdRate,
        timestamp: Date.now()
      };

    } catch (error) {
      // Use fallback rate if available
      const fallbackRate = this.fallbackRates[upperCurrency];
      if (fallbackRate) {
        logger.warn(`Using fallback rate`, { currency: upperCurrency, rate: fallbackRate });
        const usdAmount = amount * fallbackRate;
        return {
          originalAmount: amount,
          originalCurrency: upperCurrency,
          usdAmount: Math.round(usdAmount * 100) / 100,
          exchangeRate: fallbackRate,
          fallback: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Convert amount between any two currencies
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Conversion result
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string): Promise<CurrencyConversionBetween> {
    const upperFrom = fromCurrency.toUpperCase();
    const upperTo = toCurrency.toUpperCase();

    if (upperFrom === upperTo) {
      return {
        originalAmount: amount,
        originalCurrency: upperFrom,
        convertedAmount: amount,
        targetCurrency: upperTo,
        exchangeRate: 1.0,
        timestamp: Date.now()
      };
    }

    try {
      const rates = await this.fetchExchangeRates(upperFrom);
      const targetRate = rates[upperTo];

      if (!targetRate) {
        throw new Error(`No exchange rate found for ${upperFrom} to ${upperTo}`);
      }

      const convertedAmount = amount * targetRate;

      return {
        originalAmount: amount,
        originalCurrency: upperFrom,
        convertedAmount: Math.round(convertedAmount * 100) / 100,
        targetCurrency: upperTo,
        exchangeRate: targetRate,
        timestamp: Date.now()
      };

    } catch (error) {
      const err = error as Error;
      logger.error(`Error converting currency`, { error: err.message, from: upperFrom, to: upperTo });
      throw error;
    }
  }

  /**
   * Get list of supported currencies
   * @returns Array of currency codes
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const rates = await this.fetchExchangeRates('USD');
      return Object.keys(rates).sort();
    } catch (error) {
      return Object.keys(this.fallbackRates).sort();
    }
  }

  /**
   * Clear the rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
    logger.info('Currency rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, value] of this.rateCache) {
      if ((now - value.timestamp) < this.CACHE_TTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.rateCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.CACHE_TTL,
      circuitBreakerStatus: this.isCircuitOpen() ? 'OPEN' : 'CLOSED',
      failureCount: this.failureCount
    };
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();
export default CurrencyService;
