import { useState, useCallback, useEffect } from 'react';
import { pricingAPI } from '@/api/backendClient';

/**
 * Hook for fetching a single stock price
 * @param {string} ticker - Stock ticker symbol
 * @param {boolean} autoFetch - Whether to fetch on mount
 * @returns {Object} { price, loading, error, refresh }
 */
export function useStockPrice(ticker, autoFetch = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrice = useCallback(async () => {
    if (!ticker) return;

    setLoading(true);
    setError(null);

    try {
      const result = await pricingAPI.getStockPrice(ticker);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (autoFetch && ticker) {
      fetchPrice();
    }
  }, [autoFetch, ticker, fetchPrice]);

  return {
    data,
    price: data?.price,
    currency: data?.currency,
    name: data?.name,
    change: data?.change,
    changePercent: data?.changePercent,
    loading,
    error,
    refresh: fetchPrice,
  };
}

/**
 * Hook for fetching multiple stock prices
 * @param {string[]} tickers - Array of ticker symbols
 * @param {boolean} autoFetch - Whether to fetch on mount
 * @returns {Object} { prices, loading, error, refresh }
 */
export function useMultipleStockPrices(tickers, autoFetch = true) {
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    if (!tickers || tickers.length === 0) return;

    setLoading(true);

    try {
      const result = await pricingAPI.getMultipleStockPrices(tickers);
      setData(result.results || {});
      setErrors(result.errors || {});
    } catch (err) {
      setErrors({ _general: err.message });
    } finally {
      setLoading(false);
    }
  }, [tickers]);

  useEffect(() => {
    if (autoFetch && tickers?.length > 0) {
      fetchPrices();
    }
  }, [autoFetch, tickers, fetchPrices]);

  return {
    prices: data,
    errors,
    loading,
    refresh: fetchPrices,
  };
}

/**
 * Hook for currency conversion
 * @returns {Object} { convert, convertToUSD, loading, error }
 */
export function useCurrency() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rates, setRates] = useState(null);
  const [supportedCurrencies, setSupportedCurrencies] = useState([]);

  const convert = useCallback(async (amount, from, to) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pricingAPI.convertCurrency(amount, from, to);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const convertToUSD = useCallback(async (amount, from) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pricingAPI.convertToUSD(amount, from);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRates = useCallback(async (base = 'USD') => {
    setLoading(true);
    setError(null);

    try {
      const result = await pricingAPI.getExchangeRates(base);
      setRates(result.rates);
      return result.rates;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupportedCurrencies = useCallback(async () => {
    try {
      const result = await pricingAPI.getSupportedCurrencies();
      setSupportedCurrencies(result.currencies || []);
      return result.currencies;
    } catch (err) {
      console.error('Failed to fetch supported currencies:', err);
      return [];
    }
  }, []);

  return {
    convert,
    convertToUSD,
    fetchRates,
    fetchSupportedCurrencies,
    rates,
    supportedCurrencies,
    loading,
    error,
  };
}

/**
 * Hook for validating ticker symbols
 * @returns {Object} { validate, loading, error }
 */
export function useTickerValidation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validate = useCallback(async (ticker) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pricingAPI.validateTicker(ticker);
      return result;
    } catch (err) {
      setError(err.message);
      return { valid: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    validate,
    loading,
    error,
  };
}

export default {
  useStockPrice,
  useMultipleStockPrices,
  useCurrency,
  useTickerValidation,
};
