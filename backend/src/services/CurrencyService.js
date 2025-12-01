/**
 * Currency Conversion Service
 * Converts prices between currencies using exchangerate-api.com
 */

class CurrencyService {
  constructor() {
    // Cache for exchange rates (10 minute TTL)
    this.rateCache = new Map();
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
  isCircuitOpen() {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
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
  recordFailure() {
    this.failureCount++;
    this.lastFailure = Date.now();
  }

  /**
   * Record a success
   */
  recordSuccess() {
    this.failureCount = 0;
  }

  /**
   * Get cached rate if valid
   */
  getCachedRate(fromCurrency) {
    const cached = this.rateCache.get(fromCurrency.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Set rate in cache
   */
  setCachedRate(fromCurrency, data) {
    this.rateCache.set(fromCurrency.toUpperCase(), {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch exchange rates from API
   * @param {string} baseCurrency - Base currency code
   * @returns {Promise<Object>} Exchange rates
   */
  async fetchExchangeRates(baseCurrency = 'USD') {
    const upperCurrency = baseCurrency.toUpperCase();

    // Check cache first
    const cached = this.getCachedRate(upperCurrency);
    if (cached) {
      console.log(`💱 Cache hit for ${upperCurrency} rates`);
      return cached.rates;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      console.log(`⚠️ Currency API circuit breaker open, using fallback rates`);
      return this.fallbackRates;
    }

    try {
      console.log(`🔍 Fetching exchange rates for ${upperCurrency}`);

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

      const data = await response.json();

      if (!data.rates) {
        throw new Error('Invalid response from exchange rate API');
      }

      // Cache the rates
      this.setCachedRate(upperCurrency, { rates: data.rates });
      this.recordSuccess();

      console.log(`✅ Got exchange rates for ${upperCurrency}`);
      return data.rates;

    } catch (error) {
      this.recordFailure();
      console.error(`❌ Error fetching exchange rates:`, error.message);
      console.log(`⚠️ Using fallback rates`);
      return this.fallbackRates;
    }
  }

  /**
   * Convert amount from one currency to USD
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency code
   * @returns {Promise<Object>} Conversion result
   */
  async convertToUSD(amount, fromCurrency) {
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
      const usdRate = rates['USD'] || rates['usd'];

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
        console.log(`⚠️ Using fallback rate for ${upperCurrency}: ${fallbackRate}`);
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
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object>} Conversion result
   */
  async convert(amount, fromCurrency, toCurrency) {
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
      console.error(`❌ Error converting ${upperFrom} to ${upperTo}:`, error.message);
      throw error;
    }
  }

  /**
   * Get list of supported currencies
   * @returns {Promise<string[]>} Array of currency codes
   */
  async getSupportedCurrencies() {
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
  clearCache() {
    this.rateCache.clear();
    console.log('🗑️ Currency rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
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
