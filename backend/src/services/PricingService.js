/**
 * Stock Pricing Service
 * Fetches real-time stock prices from Yahoo Finance API
 */
import logger from './logger.js';

class PricingService {
  constructor() {
    // Cache for stock prices (5 minute TTL)
    this.priceCache = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailure = null;
    this.CIRCUIT_BREAKER_THRESHOLD = 5;
    this.CIRCUIT_BREAKER_RESET = 60 * 1000; // 1 minute
  }

  /**
   * Check if circuit breaker is open (too many failures)
   */
  isCircuitOpen() {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - this.lastFailure;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_RESET) {
        return true;
      }
      // Reset circuit breaker after timeout
      this.failureCount = 0;
    }
    return false;
  }

  /**
   * Record a failure for circuit breaker
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailure = Date.now();
  }

  /**
   * Record a success (reset failure count)
   */
  recordSuccess() {
    this.failureCount = 0;
  }

  /**
   * Get cached price if valid
   */
  getCachedPrice(ticker) {
    const cached = this.priceCache.get(ticker.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Set price in cache
   */
  setCachedPrice(ticker, data) {
    this.priceCache.set(ticker.toUpperCase(), {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch stock price from Yahoo Finance
   * @param {string} ticker - Stock ticker symbol
   * @returns {Promise<Object>} Price data
   */
  async getStockPrice(ticker) {
    const upperTicker = ticker.toUpperCase();

    // Check cache first
    const cached = this.getCachedPrice(upperTicker);
    if (cached) {
      logger.debug(`Cache hit for ${upperTicker}`);
      return {
        ticker: upperTicker,
        price: cached.price,
        currency: cached.currency,
        name: cached.name,
        shortName: cached.shortName,
        sector: cached.sector,
        industry: cached.industry,
        exchange: cached.exchange,
        change: cached.change,
        changePercent: cached.changePercent,
        cached: true,
        timestamp: cached.timestamp
      };
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      logger.warn(`Circuit breaker open for ${upperTicker}`);
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    try {
      logger.info(`Fetching price for ${upperTicker} from Yahoo Finance`);

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperTicker)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.chart.error) {
        throw new Error(data.chart.error.description || 'Invalid ticker symbol');
      }

      const result = data.chart.result?.[0];
      if (!result) {
        throw new Error(`No data found for ticker: ${upperTicker}`);
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];

      // Fetch additional info (sector, industry) from quoteSummary API
      let sector = null;
      let industry = null;
      let longName = null;
      try {
        const summaryResponse = await fetch(
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(upperTicker)}?modules=assetProfile,quoteType`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const assetProfile = summaryData.quoteSummary?.result?.[0]?.assetProfile;
          const quoteType = summaryData.quoteSummary?.result?.[0]?.quoteType;
          sector = assetProfile?.sector || null;
          industry = assetProfile?.industry || null;
          longName = quoteType?.longName || null;
        }
      } catch (e) {
        // Ignore errors fetching additional info - price is most important
        logger.warn(`Could not fetch sector info for ${upperTicker}:`, { error: e.message });
      }

      const priceData = {
        ticker: upperTicker,
        price: meta.regularMarketPrice || meta.previousClose || 0,
        currency: meta.currency || 'USD',
        name: longName || meta.shortName || meta.longName || upperTicker,
        shortName: meta.shortName || upperTicker,
        sector: sector,
        industry: industry,
        exchange: meta.exchangeName || 'Unknown',
        change: meta.regularMarketPrice && meta.previousClose
          ? meta.regularMarketPrice - meta.previousClose
          : 0,
        changePercent: meta.regularMarketPrice && meta.previousClose
          ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
          : 0,
        previousClose: meta.previousClose,
        open: quote?.open?.[0],
        high: quote?.high?.[0],
        low: quote?.low?.[0],
        volume: quote?.volume?.[0],
        marketState: meta.marketState,
        cached: false,
        timestamp: Date.now()
      };

      // Cache the result
      this.setCachedPrice(upperTicker, priceData);
      this.recordSuccess();

      logger.info(`Got price for ${upperTicker}: ${priceData.price} ${priceData.currency}`);
      return priceData;

    } catch (error) {
      this.recordFailure();
      logger.error(`Error fetching price for ${upperTicker}:`, { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch multiple stock prices
   * @param {string[]} tickers - Array of ticker symbols
   * @returns {Promise<Object>} Map of ticker to price data
   */
  async getMultipleStockPrices(tickers) {
    const results = {};
    const errors = {};

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          results[ticker] = await this.getStockPrice(ticker);
        } catch (error) {
          errors[ticker] = error.message;
        }
      })
    );

    return { results, errors };
  }

  /**
   * Validate a ticker symbol
   * @param {string} ticker - Ticker to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateTicker(ticker) {
    try {
      const priceData = await this.getStockPrice(ticker);
      return {
        valid: true,
        ticker: priceData.ticker,
        name: priceData.name,
        exchange: priceData.exchange,
        currency: priceData.currency,
        price: priceData.price
      };
    } catch (error) {
      return {
        valid: false,
        ticker: ticker.toUpperCase(),
        error: error.message
      };
    }
  }

  /**
   * Clear the price cache
   */
  clearCache() {
    this.priceCache.clear();
    logger.info('Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, value] of this.priceCache) {
      if ((now - value.timestamp) < this.CACHE_TTL) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.priceCache.size,
      validEntries,
      expiredEntries,
      cacheTTL: this.CACHE_TTL,
      circuitBreakerStatus: this.isCircuitOpen() ? 'OPEN' : 'CLOSED',
      failureCount: this.failureCount
    };
  }
}

// Export singleton instance
export const pricingService = new PricingService();
export default PricingService;
