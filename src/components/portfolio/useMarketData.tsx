import { useState, useEffect, useCallback, useMemo } from 'react';
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
  timestamp?: number;
};

type UseStockPricesOptions = {
  refreshIntervalMs?: number;
};

export function useStockPrices(
  tickers: string[] | undefined,
  options: UseStockPricesOptions = {}
) {
  const { refreshIntervalMs = 0 } = options;
  const [prices, setPrices] = useState<Record<string, StockPriceEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { uniqueTickers, tickerKey } = useMemo(() => {
    if (!tickers || tickers.length === 0) {
      return { uniqueTickers: [] as string[], tickerKey: '' };
    }
    const normalized = tickers
      .map((ticker) => (typeof ticker === 'string' ? ticker.trim().toUpperCase() : ''))
      .filter(Boolean);
    const unique = Array.from(new Set(normalized));
    return {
      uniqueTickers: unique,
      tickerKey: unique.join(',')
    };
  }, [tickers]);

  useEffect(() => {
    if (!uniqueTickers || uniqueTickers.length === 0) {
      setPrices({});
      setLastUpdated(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    const fetchPrices = async ({ background = false } = {}) => {
      if (!background) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await pricingAPI.getMultipleStockPrices(uniqueTickers);
        if (cancelled) return;

        const fetchedPrices: Record<string, StockPriceEntry> = {};
        if (result?.results) {
          const toNumber = (value: unknown): number | null => {
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
          };
          for (const [ticker, data] of Object.entries(result.results)) {
            const price = toNumber((data as any)?.price);
            if (price == null || price <= 0) continue;
            const upperTicker = ticker.toUpperCase();
            const previousClose = toNumber((data as any)?.previousClose);
            const apiChange = toNumber((data as any)?.change);
            const changeValue = apiChange ?? (price != null && previousClose != null ? price - previousClose : null);
            const apiChangePercent = toNumber((data as any)?.changePercent);
            const changePercent =
              apiChangePercent ??
              (changeValue != null && previousClose != null && previousClose !== 0
                ? (changeValue / previousClose) * 100
                : null);
            fetchedPrices[upperTicker] = {
              price,
              currency: (data as any).currency || "USD",
              name: (data as any).name,
              shortName: (data as any).shortName,
              sector: (data as any).sector,
              industry: (data as any).industry,
              change: changeValue ?? undefined,
              changePercent: changePercent ?? undefined,
              previousClose: previousClose ?? undefined,
              marketState: (data as any).marketState,
              timestamp: (data as any).timestamp || Date.now()
            };
          }
        }

        setPrices((prev) => {
          const requested = new Set(uniqueTickers);
          const next = { ...prev };
          let hasChanges = false;

          Object.keys(next).forEach((key) => {
            if (!requested.has(key)) {
              delete next[key];
              hasChanges = true;
            }
          });

          requested.forEach((ticker) => {
            const fresh = fetchedPrices[ticker];
            if (fresh) {
              const prevEntry = next[ticker];
              if (!prevEntry || prevEntry.price !== fresh.price || prevEntry.previousClose !== fresh.previousClose) {
                next[ticker] = fresh;
                hasChanges = true;
              }
            }
          });

          return hasChanges ? next : prev;
        });
        setLastUpdated(result?.timestamp || Date.now());
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stock prices:', err);
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled && !background) {
          setLoading(false);
        }
      }
    };

    fetchPrices();

    if (refreshIntervalMs > 0) {
      intervalId = window.setInterval(() => {
        fetchPrices({ background: true });
      }, refreshIntervalMs);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tickerKey, refreshIntervalMs, uniqueTickers]);

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
    lastUpdated,
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

      try {
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
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPrices();
    return () => { cancelled = true; };
  }, [JSON.stringify(bonds)]);

  return { prices, loading, error };
}
