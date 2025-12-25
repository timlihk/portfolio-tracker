import { useState, useEffect, useCallback } from 'react';
import { pricingAPI } from '@/api/backendClient';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD', 'SGD', 'CNY', 'KRW', 'TWD'] as const;
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  ILS: '₪',
  HKD: 'HK$',
  SGD: 'S$',
  CNY: '¥',
  KRW: '₩',
  TWD: 'NT$',
};

export type ExchangeRates = Record<string, number>;

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({
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
    TWD: 0.031,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const result = await pricingAPI.getExchangeRates('USD');
        if (result?.rates) {
          const convertedRates: ExchangeRates = { USD: 1 };
          for (const currency of CURRENCIES) {
            if (currency === 'USD') continue;
            const rate = result.rates[currency];
            if (rate && rate > 0) {
              convertedRates[currency] = 1 / rate;
            }
          }
          setRates(convertedRates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const convertToUSD = useCallback((amount: number, fromCurrency?: string | null) => {
    const num = Number(amount) || 0;
    if (!fromCurrency || fromCurrency === 'USD') return num;
    const rate = Number(rates[fromCurrency]) || 1;
    return num * rate;
  }, [rates]);

  return { rates, loading, convertToUSD, CURRENCIES };
}

export type StockPriceEntry = {
  price: number;
  currency?: string;
  name?: string;
  shortName?: string;
  sector?: string | null;
  industry?: string | null;
  change?: number;
  changePercent?: number;
  previousClose?: number;
  marketState?: string;
};

export function useStockPrices(tickers: string[] | undefined) {
  const [prices, setPrices] = useState<Record<string, StockPriceEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

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
        const result = await pricingAPI.getMultipleStockPrices(uniqueTickers);
        const fetchedPrices: Record<string, StockPriceEntry> = {};
        if (result?.results) {
          for (const [ticker, data] of Object.entries(result.results)) {
            if (data && typeof (data as any).price === 'number' && (data as any).price > 0) {
              fetchedPrices[ticker.toUpperCase()] = {
                price: (data as any).price,
                currency: (data as any).currency || 'USD',
                name: (data as any).name,
                shortName: (data as any).shortName,
                sector: (data as any).sector,
                industry: (data as any).industry,
                change: (data as any).change,
                changePercent: (data as any).changePercent,
                previousClose: (data as any).previousClose,
                marketState: (data as any).marketState,
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

  const getPrice = useCallback((ticker?: string | null) => {
    if (!ticker) return null;
    const data = prices[ticker.toUpperCase()];
    return data?.price ?? null;
  }, [prices]);

  const getPriceData = useCallback((ticker?: string | null) => {
    if (!ticker) return null;
    return prices[ticker.toUpperCase()] || null;
  }, [prices]);

  return {
    prices,
    loading,
    error,
    getPrice,
    getPriceData,
  };
}

export type BondPriceEntry = {
  pricePct: number;
  source: string;
  currency: string;
  updatedAt?: number | string;
};

export function useBondPrices(bonds: Array<{ id: number | string; isin?: string | null; name?: string; currentValue?: number | null; purchasePrice?: number | null; currency?: string | null }> | undefined) {
  const [prices, setPrices] = useState<Record<string, BondPriceEntry | number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const toNumber = (val: unknown) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  useEffect(() => {
    if (!bonds || bonds.length === 0) {
      setPrices({});
      return;
    }

    const uniqueIsins = Array.from(new Set(bonds.map((b) => b.isin).filter(Boolean) as string[]));
    let cancelled = false;

    const fetchPrices = async () => {
      setLoading(true);
      setError(null);
      const apiPrices = new Map<string, BondPriceEntry>();

      const results = await Promise.all(uniqueIsins.map(async (isin) => {
        try {
          const data = await pricingAPI.getBondPriceByIsin(isin);
          if (data && Number.isFinite(data.pricePct) && data.pricePct > 0) {
            return { isin, price: {
              pricePct: Number(data.pricePct),
              source: data.source || 'api',
              currency: data.currency || 'USD',
              updatedAt: data.timestamp || Date.now(),
            } as BondPriceEntry };
          }
        } catch (err) {
          console.error('Failed to fetch bond price', isin, err);
          setError(err);
        }
        return null;
      }));

      results.filter(Boolean).forEach((entry) => {
        const typed = entry as { isin: string; price: BondPriceEntry };
        apiPrices.set(typed.isin, typed.price);
      });

      const priceMap: Record<string, BondPriceEntry | number> = {};
      bonds.forEach((bond) => {
        const priceData = (bond.isin && apiPrices.get(bond.isin)) || null;
        const manualPrice = toNumber(bond.currentValue);
        const purchasePct = toNumber(bond.purchasePrice);
        const chosenPrice = manualPrice ?? priceData?.pricePct ?? purchasePct ?? 100;
        const entry = {
          pricePct: chosenPrice,
          source: manualPrice != null ? 'manual' : priceData ? priceData.source : 'fallback',
          currency: manualPrice != null ? (bond.currency || priceData?.currency || 'USD') : (priceData?.currency || bond.currency || 'USD'),
          updatedAt: priceData?.updatedAt || Date.now(),
        } as BondPriceEntry;

        const key = bond.id?.toString() || bond.isin || bond.name || `${Math.random()}`;
        priceMap[key] = entry;
        if (bond.isin) priceMap[bond.isin] = entry;
        if (bond.name) priceMap[bond.name] = entry;
      });

      if (!cancelled) {
        setPrices(priceMap);
      }
    };

    fetchPrices();
    return () => { cancelled = true; };
  }, [JSON.stringify(bonds)]);

  return { prices, loading, error };
}
