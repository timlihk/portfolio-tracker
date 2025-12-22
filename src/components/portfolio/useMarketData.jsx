import { useState, useEffect, useCallback } from 'react';
import { pricingAPI } from '@/api/backendClient';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD', 'SGD', 'CNY', 'KRW', 'TWD'];

export function useExchangeRates() {
  const [rates, setRates] = useState({
    USD: 1,
    EUR: 1.10,
    GBP: 1.27,
    CHF: 1.12,
    JPY: 0.0067,
    CAD: 0.74,
    AUD: 0.66,
    ILS: 0.27,
    HKD: 0.128,
    SGD: 0.74,
    CNY: 0.14,
    KRW: 0.00075,
    TWD: 0.031
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch rates from our backend API (which uses exchangerate-api.com)
        const result = await pricingAPI.getExchangeRates('USD');

        if (result?.rates) {
          // Convert rates: API returns "how many X per 1 USD"
          // We need: "how many USD per 1 X"
          const convertedRates = { USD: 1 };

          for (const currency of CURRENCIES) {
            if (currency === 'USD') continue;
            const rate = result.rates[currency];
            if (rate && rate > 0) {
              // Invert the rate: 1/rate gives us "USD per 1 unit of currency"
              convertedRates[currency] = 1 / rate;
            }
          }

          setRates(convertedRates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        // Keep fallback rates
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const convertToUSD = useCallback((amount, fromCurrency) => {
    const num = Number(amount) || 0;
    if (!fromCurrency || fromCurrency === 'USD') return num;
    const rate = Number(rates[fromCurrency]) || 1;
    return num * rate;
  }, [rates]);

  return { rates, loading, convertToUSD, CURRENCIES };
}

export function useStockPrices(tickers) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tickers || tickers.length === 0) {
      setPrices({});
      return;
    }

    const uniqueTickers = [...new Set(tickers.filter(t => t && typeof t === 'string' && t.trim()))];
    if (uniqueTickers.length === 0) {
      setPrices({});
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use our backend API (which uses Yahoo Finance)
        const result = await pricingAPI.getMultipleStockPrices(uniqueTickers);

        const fetchedPrices = {};
        if (result?.results) {
          for (const [ticker, data] of Object.entries(result.results)) {
            if (data && typeof data.price === 'number' && data.price > 0) {
              fetchedPrices[ticker] = {
                price: data.price,
                currency: data.currency || 'USD',
                name: data.name,
                shortName: data.shortName,
                sector: data.sector,
                industry: data.industry,
                change: data.change,
                changePercent: data.changePercent,
                previousClose: data.previousClose,
                marketState: data.marketState
              };
            }
          }
        }

        setPrices(fetchedPrices);
      } catch (err) {
        console.error('Failed to fetch stock prices:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [JSON.stringify(tickers)]);

  // Helper to get just the price number for a ticker
  const getPrice = useCallback((ticker) => {
    const data = prices[ticker?.toUpperCase()];
    return data?.price || null;
  }, [prices]);

  // Helper to get full price data for a ticker
  const getPriceData = useCallback((ticker) => {
    return prices[ticker?.toUpperCase()] || null;
  }, [prices]);

  return {
    prices,
    loading,
    error,
    getPrice,
    getPriceData
  };
}

export function useBondPrices(bonds) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bonds || bonds.length === 0) return;

    // For bonds, use currentValue/faceValue/purchasePrice as the default value
    const bondPrices = {};
    for (const bond of bonds) {
      const { currentValue, faceValue, purchasePrice } = bond;
      bondPrices[bond.name] = currentValue || faceValue || purchasePrice || 0;
    }

    setPrices(bondPrices);
    setLoading(false);
  }, [bonds?.map(b => b.id).join(',')]);

  return { prices, loading };
}

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF ',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  ILS: '₪',
  HKD: 'HK$',
  SGD: 'S$',
  CNY: '¥',
  KRW: '₩',
  TWD: 'NT$'
};

export function formatCurrency(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// New helper: Format price with change indicator
export function formatPriceWithChange(priceData) {
  if (!priceData) return null;

  const { price, currency, change, changePercent } = priceData;
  const formattedPrice = formatCurrency(price, currency);

  if (change === undefined || change === null) {
    return { formattedPrice, change: null, changePercent: null, isPositive: null };
  }

  const isPositive = change >= 0;
  const changeStr = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  const percentStr = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  return {
    formattedPrice,
    change: changeStr,
    changePercent: percentStr,
    isPositive
  };
}
