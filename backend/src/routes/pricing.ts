import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pricingService } from '../services/PricingService.js';
import { currencyService } from '../services/CurrencyService.js';
import logger from '../services/logger.js';
import type { StockPriceData } from '../types/index.js';

const router = express.Router();

type RequestWithCookies = Request & { cookies?: Record<string, string> };

function getSharedSecretFromRequest(req: RequestWithCookies): string | undefined {
  const authHeader = req.headers.authorization;
  const sharedHeader =
    (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
    (req.headers['x-shared-secret'] as string | undefined);
  const cookieSecret = req.cookies?.shared_secret;
  return cookieSecret || sharedHeader;
}

const pricingAuthMiddleware = async (req: RequestWithCookies, res: Response, next: NextFunction) => {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  const jwtSecret = process.env.JWT_SECRET;

  if (!sharedSecret && !jwtSecret) {
    return next();
  }

  const providedSecret = getSharedSecretFromRequest(req);
  if (sharedSecret && providedSecret === sharedSecret) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (jwtSecret && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    try {
      jwt.verify(token, jwtSecret);
      return next();
    } catch {
      // fall through
    }
  }

  return res.status(403).json({ error: 'Authentication required' });
};

router.use(pricingAuthMiddleware);

/**
 * GET /api/pricing/stock/:ticker
 * Get real-time price for a single stock
 */
router.get('/stock/:ticker', async (req: Request<{ ticker: string }, {}, {}, { convertTo?: string }>, res: Response) => {
  try {
    const { ticker } = req.params;
    const { convertTo } = req.query;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required' });
    }

    const priceData: StockPriceData = await pricingService.getStockPrice(ticker);

    // Convert to different currency if requested
    if (convertTo && convertTo.toUpperCase() !== priceData.currency) {
      const conversion = await currencyService.convert(
        priceData.price,
        priceData.currency,
        convertTo
      );
      priceData.convertedPrice = conversion.convertedAmount;
      priceData.convertedCurrency = conversion.targetCurrency;
      priceData.exchangeRate = conversion.exchangeRate;
    }

    res.json(priceData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching stock price:', { error: errorMessage, ticker: req.params.ticker });
    res.status(500).json({
      error: 'Failed to fetch stock price',
      message: errorMessage
    });
  }
});

interface StocksRequestBody {
  tickers: string[];
  convertTo?: string;
}

interface StocksResponse {
  results: Record<string, StockPriceData>;
  errors?: Record<string, string>;
  count: number;
  timestamp: number;
}

interface BondPriceResponse {
  isin: string;
  pricePct: number;
  currency?: string | null;
  source: string;
  timestamp: number;
  message?: string;
}

/**
 * POST /api/pricing/stocks
 * Get real-time prices for multiple stocks
 * Body: { tickers: ["AAPL", "GOOGL", "MSFT"] }
 */
router.post('/stocks', async (req: Request<{}, {}, StocksRequestBody>, res: Response<StocksResponse>) => {
  try {
    const { tickers, convertTo } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        error: 'Array of ticker symbols is required',
        results: {},
        count: 0,
        timestamp: Date.now()
      } as any);
    }

    if (tickers.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 tickers per request',
        results: {},
        count: 0,
        timestamp: Date.now()
      } as any);
    }

    const { results, errors } = await pricingService.getMultipleStockPrices(tickers);

    // Convert prices if requested
    if (convertTo) {
      const targetCurrency = convertTo.toUpperCase();
      const conversionCache = new Map<string, number>();

      const getRate = async (fromCurrency: string): Promise<number> => {
        if (conversionCache.has(fromCurrency)) {
          return conversionCache.get(fromCurrency)!;
        }
        const conversion = await currencyService.convert(1, fromCurrency, targetCurrency);
        conversionCache.set(fromCurrency, conversion.exchangeRate);
        return conversion.exchangeRate;
      };

      for (const ticker of Object.keys(results)) {
        const priceData = results[ticker];
        const fromCurrency = (priceData.currency || 'USD').toUpperCase();
        if (fromCurrency === targetCurrency) {
          priceData.convertedPrice = Math.round(priceData.price * 100) / 100;
          priceData.convertedCurrency = targetCurrency;
          priceData.exchangeRate = 1;
          continue;
        }
        try {
          const rate = await getRate(fromCurrency);
          const convertedAmount = Math.round(priceData.price * rate * 100) / 100;
          priceData.convertedPrice = convertedAmount;
          priceData.convertedCurrency = targetCurrency;
          priceData.exchangeRate = rate;
        } catch (e) {
          logger.warn('Currency conversion failed', {
            error: e instanceof Error ? e.message : 'Unknown error',
            from: fromCurrency,
            to: targetCurrency
          });
        }
      }
    }

    res.json({
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      count: Object.keys(results).length,
      timestamp: Date.now()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching stock prices:', { error: errorMessage, tickerCount: req.body.tickers?.length });
    res.status(500).json({
      error: 'Failed to fetch stock prices',
      message: errorMessage,
      results: {},
      count: 0,
      timestamp: Date.now()
    } as any);
  }
});

interface TickerValidation {
  valid: boolean;
  ticker: string;
  name?: string;
  exchange?: string;
  currency?: string;
  price?: number;
  error?: string;
  message?: string;
}

/**
 * GET /api/pricing/validate/:ticker
 * Validate a ticker symbol
 */
router.get('/validate/:ticker', async (req: Request<{ ticker: string }>, res: Response<TickerValidation>) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        ticker: '',
        valid: false,
        error: 'Ticker symbol is required'
      } as any);
    }

    const validation = await pricingService.validateTicker(ticker);
    res.json(validation);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error validating ticker:', { error: errorMessage, ticker: req.params.ticker });
    res.status(500).json({
      ticker: req.params.ticker,
      valid: false,
      error: 'Failed to validate ticker',
      message: errorMessage
    } as any);
  }
});

/**
 * GET /api/pricing/bond/:isin
 * Get latest bond price (percent of par) by ISIN via Finnhub
 */
router.get('/bond/:isin', async (req: Request<{ isin: string }>, res: Response<BondPriceResponse>) => {
  const { isin } = req.params;
  if (!isin) {
    return res.status(400).json({} as any);
  }
  try {
    const data = await pricingService.getBondPriceByIsin(isin);
    return res.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching bond price:', { isin, error: message });
    return res.status(500).json({
      isin: isin.toUpperCase(),
      pricePct: 0,
      currency: undefined,
      source: 'error',
      timestamp: Date.now(),
      message
    } as any);
  }
});

interface CurrencyConversionResponse {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount?: number;
  targetCurrency?: string;
  exchangeRate: number;
  timestamp: number;
}

/**
 * GET /api/pricing/currency/convert
 * Convert amount between currencies
 * Query params: amount, from, to
 */
router.get('/currency/convert', async (req: Request<{}, {}, {}, { amount?: string; from?: string; to?: string }>, res: Response<CurrencyConversionResponse>) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({
        error: 'Missing required parameters: amount, from, to'
      } as any);
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: 'Invalid amount' } as any);
    }

    const conversion = await currencyService.convert(numAmount, from, to);
    res.json(conversion);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { amount, from, to } = req.query;
    logger.error('Error converting currency:', { error: errorMessage, amount, from, to });
    res.status(500).json({
      error: 'Failed to convert currency',
      message: errorMessage
    } as any);
  }
});

/**
 * GET /api/pricing/currency/to-usd
 * Convert amount to USD
 * Query params: amount, from
 */
router.get('/currency/to-usd', async (req: Request<{}, {}, {}, { amount?: string; from?: string }>, res: Response) => {
  try {
    const { amount, from } = req.query;

    if (!amount || !from) {
      return res.status(400).json({
        error: 'Missing required parameters: amount, from'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const conversion = await currencyService.convertToUSD(numAmount, from);
    res.json(conversion);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { amount, from } = req.query;
    logger.error('Error converting to USD:', { error: errorMessage, amount, from });
    res.status(500).json({
      error: 'Failed to convert to USD',
      message: errorMessage
    });
  }
});

interface ExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * GET /api/pricing/currency/rates/:base
 * Get all exchange rates for a base currency
 */
router.get('/currency/rates/:base?', async (req: Request<{ base?: string }>, res: Response<ExchangeRatesResponse>) => {
  try {
    const { base } = req.params;
    const rates = await currencyService.fetchExchangeRates(base || 'USD');

    res.json({
      base: (base || 'USD').toUpperCase(),
      rates,
      timestamp: Date.now()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const base = req.params.base || 'USD';
    logger.error('Error fetching exchange rates:', { error: errorMessage, base });
    res.status(500).json({
      error: 'Failed to fetch exchange rates',
      message: errorMessage
    } as any);
  }
});

interface SupportedCurrenciesResponse {
  currencies: string[];
  count: number;
}

/**
 * GET /api/pricing/currency/supported
 * Get list of supported currencies
 */
router.get('/currency/supported', async (req: Request, res: Response<SupportedCurrenciesResponse>) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    res.json({
      currencies,
      count: currencies.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching supported currencies:', { error: errorMessage });
    res.status(500).json({
      error: 'Failed to fetch supported currencies',
      message: errorMessage
    } as any);
  }
});

type CacheStats = {
  pricing: ReturnType<typeof pricingService.getCacheStats>;
  currency: ReturnType<typeof currencyService.getCacheStats>;
};

function requirePricingAdmin(req: Request, res: Response, next: () => void): void | Response {
  const sharedSecret = process.env.SHARED_SECRET || process.env.SECRET_PHRASE;
  const authHeader = req.headers.authorization;
  const sharedHeader =
    (authHeader?.startsWith('Shared ') && authHeader.replace('Shared ', '')) ||
    (req.headers['x-shared-secret'] as string | undefined);

  if (sharedSecret) {
    if (sharedHeader === sharedSecret) return next();
    return res.status(403).json({ error: 'Forbidden' });
  }

  // If no secret is configured, only allow in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * GET /api/pricing/cache/stats
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', requirePricingAdmin, (req: Request, res: Response<CacheStats>) => {
  res.json({
    pricing: pricingService.getCacheStats(),
    currency: currencyService.getCacheStats()
  });
});

interface CacheClearResponse {
  message: string;
}

/**
 * POST /api/pricing/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', requirePricingAdmin, (req: Request, res: Response<CacheClearResponse>) => {
  pricingService.clearCache();
  currencyService.clearCache();
  res.json({ message: 'Caches cleared successfully' });
});

export default router;
