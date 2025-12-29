/**
 * Stock Pricing Service
 * Fetches real-time stock prices from Yahoo Finance API
 */
import logger from './logger.js';
import type { StockPriceData } from '../types/index.js';

interface BondPriceData {
  isin: string;
  pricePct: number;
  currency?: string | null;
  source: 'finnhub' | 'cache';
  timestamp: number;
}

interface CachedPrice extends StockPriceData {
  timestamp: number;
}

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  exchangeName?: string;
  marketState?: string;
}

interface YahooQuote {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  volume?: (number | null)[];
}

interface YahooChartResult {
  meta: YahooChartMeta;
  indicators?: {
    quote?: YahooQuote[];
  };
}

interface YahooChartResponse {
  chart: {
    result?: YahooChartResult[];
    error?: {
      description?: string;
    };
  };
}

interface YahooAssetProfile {
  sector?: string;
  industry?: string;
}

interface YahooQuoteType {
  longName?: string;
}

interface YahooSummaryResponse {
  quoteSummary?: {
    result?: Array<{
      assetProfile?: YahooAssetProfile;
      quoteType?: YahooQuoteType;
    }>;
  };
}

interface YahooQuoteResult {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  currency?: string;
  shortName?: string;
  longName?: string;
  fullExchangeName?: string;
  marketState?: string;
  marketCap?: number;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[];
    error?: unknown;
  };
}

interface CachedProfile {
  sector: string | null;
  industry: string | null;
  longName: string | null;
  timestamp: number;
}

interface MultipleStockPricesResult {
  results: Record<string, StockPriceData>;
  errors: Record<string, string>;
}

interface TickerValidationSuccess {
  valid: true;
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
}

interface TickerValidationFailure {
  valid: false;
  ticker: string;
  error: string;
}

type TickerValidationResult = TickerValidationSuccess | TickerValidationFailure;

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  cacheTTL: number;
  circuitBreakerStatus: 'OPEN' | 'CLOSED';
  failureCount: number;
}

class PricingService {
  private priceCache: Map<string, CachedPrice>;
  private bondPriceCache: Map<string, BondPriceData>;
  private profileCache: Map<string, CachedProfile>;
  private readonly CACHE_TTL: number;
  private readonly BOND_CACHE_TTL: number;
  private readonly PROFILE_CACHE_TTL: number;
  private failureCount: number;
  private lastFailure: number | null;
  private readonly CIRCUIT_BREAKER_THRESHOLD: number;
  private readonly CIRCUIT_BREAKER_RESET: number;

  constructor() {
    // Cache for stock prices (5 minute TTL)
    this.priceCache = new Map<string, CachedPrice>();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    this.bondPriceCache = new Map<string, BondPriceData>();
    this.BOND_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
    this.profileCache = new Map<string, CachedProfile>();
    this.PROFILE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

    // Circuit breaker state
    this.failureCount = 0;
    this.lastFailure = null;
    this.CIRCUIT_BREAKER_THRESHOLD = 5;
    this.CIRCUIT_BREAKER_RESET = 60 * 1000; // 1 minute
  }

  /**
   * Check if circuit breaker is open (too many failures)
   */
  private isCircuitOpen(): boolean {
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - (this.lastFailure ?? 0);
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
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailure = Date.now();
  }

  /**
   * Record a success (reset failure count)
   */
  private recordSuccess(): void {
    this.failureCount = 0;
  }

  /**
   * Get cached price if valid
   */
  private getCachedPrice(ticker: string): CachedPrice | null {
    const cached = this.priceCache.get(ticker.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  /**
   * Set price in cache
   */
  private setCachedPrice(ticker: string, data: StockPriceData): void {
    this.priceCache.set(ticker.toUpperCase(), {
      ...data,
      timestamp: Date.now()
    });
  }

  private getCachedBondPrice(isin: string): BondPriceData | null {
    const cached = this.bondPriceCache.get(isin.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.BOND_CACHE_TTL) {
      return cached;
    }
    return null;
  }

  private setCachedBondPrice(isin: string, data: BondPriceData): void {
    this.bondPriceCache.set(isin.toUpperCase(), {
      ...data,
      timestamp: Date.now()
    });
  }

  private getCachedProfile(ticker: string): CachedProfile | null {
    const cached = this.profileCache.get(ticker.toUpperCase());
    if (cached && (Date.now() - cached.timestamp) < this.PROFILE_CACHE_TTL) {
      return cached;
    }
    return null;
  }

  private setCachedProfile(ticker: string, profile: Omit<CachedProfile, 'timestamp'>): void {
    this.profileCache.set(ticker.toUpperCase(), {
      ...profile,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch stock price from Yahoo Finance
   * @param ticker - Stock ticker symbol
   * @returns Price data
   */
  async getStockPrice(ticker: string): Promise<StockPriceData> {
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

      const quoteResponse = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(upperTicker)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      let quoteResult: YahooQuoteResult | null = null;
      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json() as YahooQuoteResponse;
        quoteResult = quoteData.quoteResponse?.result?.[0] ?? null;
      }

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

      const data = await response.json() as YahooChartResponse;

      if (data.chart.error) {
        throw new Error(data.chart.error.description || 'Invalid ticker symbol');
      }

      const result = data.chart.result?.[0];
      if (!result) {
        throw new Error(`No data found for ticker: ${upperTicker}`);
      }

      const meta = result.meta;
      const chartQuote = result.indicators?.quote?.[0];

      // Fetch additional info (sector, industry) from quoteSummary API
      let sector: string | null = null;
      let industry: string | null = null;
      let longName: string | null = null;
      const cachedProfile = this.getCachedProfile(upperTicker);
      if (cachedProfile) {
        ({ sector, industry, longName } = cachedProfile);
      } else {
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
            const summaryData = await summaryResponse.json() as YahooSummaryResponse;
            const assetProfile = summaryData.quoteSummary?.result?.[0]?.assetProfile;
            const quoteType = summaryData.quoteSummary?.result?.[0]?.quoteType;
            sector = assetProfile?.sector ?? null;
            industry = assetProfile?.industry ?? null;
            longName = quoteType?.longName ?? null;
            this.setCachedProfile(upperTicker, { sector, industry, longName });
          }
        } catch (e) {
          // Ignore errors fetching additional info - price is most important
          const error = e as Error;
          logger.warn(`Could not fetch sector info for ${upperTicker}:`, { error: error.message });
        }
      }

      const toNumber = (value: unknown): number | null => {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      };

      const livePrice =
        toNumber(quoteResult?.regularMarketPrice) ??
        meta.regularMarketPrice ??
        meta.chartPreviousClose ??
        meta.previousClose ??
        0;

      const previousClose =
        toNumber(quoteResult?.regularMarketPreviousClose) ??
        meta.chartPreviousClose ??
        meta.previousClose ??
        livePrice;

      const changeValue =
        toNumber(quoteResult?.regularMarketChange) ??
        (livePrice != null && previousClose != null ? livePrice - previousClose : 0);

      const changePercent =
        toNumber(quoteResult?.regularMarketChangePercent) ??
        (previousClose && previousClose !== 0
          ? (changeValue / previousClose) * 100
          : 0);

      const priceData: StockPriceData = {
        ticker: upperTicker,
        price: livePrice,
        currency: quoteResult?.currency ?? meta.currency ?? 'USD',
        name: longName ?? quoteResult?.longName ?? meta.shortName ?? meta.longName ?? upperTicker,
        shortName: quoteResult?.shortName ?? meta.shortName ?? upperTicker,
        sector: sector,
        industry: industry,
        exchange: quoteResult?.fullExchangeName ?? meta.exchangeName ?? 'Unknown',
        change: changeValue,
        changePercent,
        previousClose,
        open: toNumber(quoteResult?.regularMarketOpen) ?? chartQuote?.open?.[0] ?? undefined,
        high: toNumber(quoteResult?.regularMarketDayHigh) ?? chartQuote?.high?.[0] ?? undefined,
        low: toNumber(quoteResult?.regularMarketDayLow) ?? chartQuote?.low?.[0] ?? undefined,
        volume: toNumber(quoteResult?.regularMarketVolume) ?? chartQuote?.volume?.[0] ?? undefined,
        marketState: quoteResult?.marketState ?? meta.marketState,
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
      const err = error as Error;
      logger.error(`Error fetching price for ${upperTicker}:`, { error: err.message });
      throw error;
    }
  }

  async getBondPriceByIsin(isin: string): Promise<BondPriceData> {
    const upperIsin = isin.toUpperCase().trim();
    if (!upperIsin || upperIsin.length < 6) {
      throw new Error('Invalid ISIN');
    }

    const cached = this.getCachedBondPrice(upperIsin);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY not configured');
    }

    // Try Finnhub bond profile (returns last price as percentage of par for many issues)
    const endpoints = [
      `https://finnhub.io/api/v1/bond/profile?isin=${encodeURIComponent(upperIsin)}&token=${apiKey}`,
      `https://finnhub.io/api/v1/bond/price?isin=${encodeURIComponent(upperIsin)}&token=${apiKey}`
    ];

    let pricePct: number | null = null;
    let currency: string | null = null;
    let lastError: string | null = null;

    for (const url of endpoints) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          lastError = `HTTP ${resp.status}`;
          continue;
        }
        const data = await resp.json() as any;
        const candidates = [
          data?.lastPrice,
          data?.last_price,
          data?.marketPrice,
          data?.price,
          data?.midPrice,
          data?.mid_price,
          data?.close,
          data?.data?.price
        ];
        const found = candidates
          .map((v) => Number(v))
          .find((v) => Number.isFinite(v) && v > 0);
        if (Number.isFinite(found)) {
          pricePct = found!;
          currency = data?.currency ?? data?.baseCurrency ?? null;
          break;
        }
      } catch (err) {
        const error = err as Error;
        lastError = error.message;
      }
    }

    if (!pricePct) {
      throw new Error(lastError || 'No bond price available');
    }

    const result: BondPriceData = {
      isin: upperIsin,
      pricePct,
      currency: currency ?? 'USD',
      source: 'finnhub',
      timestamp: Date.now()
    };
    this.setCachedBondPrice(upperIsin, result);
    return result;
  }

  /**
   * Fetch multiple stock prices
   * @param tickers - Array of ticker symbols
   * @returns Map of ticker to price data
   */
  async getMultipleStockPrices(tickers: string[]): Promise<MultipleStockPricesResult> {
    const results: Record<string, StockPriceData> = {};
    const errors: Record<string, string> = {};

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          results[ticker] = await this.getStockPrice(ticker);
        } catch (error) {
          const err = error as Error;
          errors[ticker] = err.message;
        }
      })
    );

    return { results, errors };
  }

  /**
   * Validate a ticker symbol
   * @param ticker - Ticker to validate
   * @returns Validation result
   */
  async validateTicker(ticker: string): Promise<TickerValidationResult> {
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
      const err = error as Error;
      return {
        valid: false,
        ticker: ticker.toUpperCase(),
        error: err.message
      };
    }
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache.clear();
    this.bondPriceCache.clear();
    this.profileCache.clear();
    logger.info('Price, bond, and profile caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const now = Date.now();
    let priceValid = 0;
    let priceExpired = 0;
    for (const [, value] of this.priceCache) {
      if ((now - value.timestamp) < this.CACHE_TTL) priceValid++;
      else priceExpired++;
    }

    let bondValid = 0;
    let bondExpired = 0;
    for (const [, value] of this.bondPriceCache) {
      if ((now - value.timestamp) < this.BOND_CACHE_TTL) bondValid++;
      else bondExpired++;
    }

    let profileValid = 0;
    let profileExpired = 0;
    for (const [, value] of this.profileCache) {
      if ((now - value.timestamp) < this.PROFILE_CACHE_TTL) profileValid++;
      else profileExpired++;
    }

    return {
      totalEntries: this.priceCache.size + this.bondPriceCache.size + this.profileCache.size,
      validEntries: priceValid + bondValid + profileValid,
      expiredEntries: priceExpired + bondExpired + profileExpired,
      cacheTTL: this.CACHE_TTL,
      circuitBreakerStatus: this.isCircuitOpen() ? 'OPEN' : 'CLOSED',
      failureCount: this.failureCount
    };
  }
}

// Export singleton instance
export const pricingService = new PricingService();
export default PricingService;
