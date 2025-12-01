import express from 'express';
import { pricingService } from '../services/PricingService.js';
import { currencyService } from '../services/CurrencyService.js';

const router = express.Router();

/**
 * GET /api/pricing/stock/:ticker
 * Get real-time price for a single stock
 */
router.get('/stock/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { convertTo } = req.query; // Optional: convert to specific currency

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required' });
    }

    const priceData = await pricingService.getStockPrice(ticker);

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
    console.error('Error fetching stock price:', error);
    res.status(500).json({
      error: 'Failed to fetch stock price',
      message: error.message
    });
  }
});

/**
 * POST /api/pricing/stocks
 * Get real-time prices for multiple stocks
 * Body: { tickers: ["AAPL", "GOOGL", "MSFT"] }
 */
router.post('/stocks', async (req, res) => {
  try {
    const { tickers, convertTo } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Array of ticker symbols is required' });
    }

    if (tickers.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 tickers per request' });
    }

    const { results, errors } = await pricingService.getMultipleStockPrices(tickers);

    // Convert prices if requested
    if (convertTo) {
      for (const ticker of Object.keys(results)) {
        const priceData = results[ticker];
        if (priceData.currency !== convertTo.toUpperCase()) {
          try {
            const conversion = await currencyService.convert(
              priceData.price,
              priceData.currency,
              convertTo
            );
            priceData.convertedPrice = conversion.convertedAmount;
            priceData.convertedCurrency = conversion.targetCurrency;
            priceData.exchangeRate = conversion.exchangeRate;
          } catch (e) {
            // Keep original price if conversion fails
          }
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
    console.error('Error fetching stock prices:', error);
    res.status(500).json({
      error: 'Failed to fetch stock prices',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/validate/:ticker
 * Validate a ticker symbol
 */
router.get('/validate/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker symbol is required' });
    }

    const validation = await pricingService.validateTicker(ticker);
    res.json(validation);
  } catch (error) {
    console.error('Error validating ticker:', error);
    res.status(500).json({
      error: 'Failed to validate ticker',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/currency/convert
 * Convert amount between currencies
 * Query params: amount, from, to
 */
router.get('/currency/convert', async (req, res) => {
  try {
    const { amount, from, to } = req.query;

    if (!amount || !from || !to) {
      return res.status(400).json({
        error: 'Missing required parameters: amount, from, to'
      });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const conversion = await currencyService.convert(numAmount, from, to);
    res.json(conversion);
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({
      error: 'Failed to convert currency',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/currency/to-usd
 * Convert amount to USD
 * Query params: amount, from
 */
router.get('/currency/to-usd', async (req, res) => {
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
    console.error('Error converting to USD:', error);
    res.status(500).json({
      error: 'Failed to convert to USD',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/currency/rates/:base
 * Get all exchange rates for a base currency
 */
router.get('/currency/rates/:base', async (req, res) => {
  try {
    const { base } = req.params;
    const rates = await currencyService.fetchExchangeRates(base || 'USD');

    res.json({
      base: (base || 'USD').toUpperCase(),
      rates,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange rates',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/currency/supported
 * Get list of supported currencies
 */
router.get('/currency/supported', async (req, res) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    res.json({
      currencies,
      count: currencies.length
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({
      error: 'Failed to fetch supported currencies',
      message: error.message
    });
  }
});

/**
 * GET /api/pricing/cache/stats
 * Get cache statistics (for debugging)
 */
router.get('/cache/stats', (req, res) => {
  res.json({
    pricing: pricingService.getCacheStats(),
    currency: currencyService.getCacheStats()
  });
});

/**
 * POST /api/pricing/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', (req, res) => {
  pricingService.clearCache();
  currencyService.clearCache();
  res.json({ message: 'Caches cleared successfully' });
});

export default router;
