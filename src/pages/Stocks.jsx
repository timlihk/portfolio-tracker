import { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities, pricingAPI } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExchangeRates, useStockPrices, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import { RefreshCw } from 'lucide-react';

const stockLogger = createChangeLogger('Stock');
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SECTORS = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Real Estate', 'Utilities', 'Materials', 'Communications', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD'];

const getStockFields = (accounts, sectorOptions) => [
  { name: 'ticker', label: 'Ticker Symbol', required: true, placeholder: 'AAPL' },
  { name: 'companyName', label: 'Company Name', placeholder: 'Apple Inc.' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'shares', label: 'Number of Shares', type: 'number', required: true, placeholder: '100', step: '1' },
  { name: 'averageCost', label: 'Average Cost per Share', type: 'number', required: true, placeholder: '150.00' },
  { name: 'currentPrice', label: 'Current Price (leave empty for live)', type: 'number', placeholder: 'Auto-fetched' },
  { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { name: 'sector', label: 'Sector', type: 'select', options: sectorOptions, allowCustom: true },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Stocks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [tickerLookupLoading, setTickerLookupLoading] = useState(false);
  const [tickerError, setTickerError] = useState('');
  const [sortKey, setSortKey] = useState('ticker');
  const [sortDir, setSortDir] = useState('asc');
  const tickerLookupRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const queryClient = useQueryClient();

  const { data: stocksResponse, isFetching: stocksLoading } = useQuery({
    queryKey: ['stocks', page, limit, accountFilter, sectorFilter],
    queryFn: () => entities.Stock.listWithPagination({
      page,
      limit,
      account: accountFilter || undefined,
      sector: sectorFilter || undefined
    }),
    keepPreviousData: true
  });
  const stocks = stocksResponse?.data || [];
  const pagination = stocksResponse?.pagination || { total: stocks.length, page, limit };

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const sectorOptions = useMemo(() => {
    const opts = new Set(SECTORS);
    stocks.forEach((s) => {
      if (s.sector) {
        opts.add(s.sector);
      }
    });
    if (formData.sector) {
      opts.add(formData.sector);
    }
    return Array.from(opts);
  }, [formData.sector, stocks]);

  const stockFields = useMemo(
    () => getStockFields(accounts, sectorOptions),
    [accounts, sectorOptions]
  );

  // Get real-time prices and exchange rates
  const stockTickers = useMemo(() => stocks.map(s => s.ticker).filter(Boolean), [stocks]);
  const { prices: stockPrices = {}, loading: pricesLoading } = useStockPrices(stockTickers);
  const { convertToUSD = (v) => v, loading: ratesLoading } = useExchangeRates() || {};

  const [accountFilter, setAccountFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  const isLoadingPrices = pricesLoading || ratesLoading;

  // Helper to get current price (real-time or manual)
  // Note: PostgreSQL returns DECIMAL as strings, so we need to convert to numbers
  // stockPrices[ticker] is an object with { price, currency, name, ... }
  const getCurrentPrice = (stock) => Number(stockPrices[stock.ticker]?.price) || Number(stock.currentPrice) || Number(stock.averageCost) || 0;

  const createMutation = useMutation({
    mutationFn: (data) => entities.Stock.create(data),
    onSuccess: (_, data) => {
      stockLogger.logCreate(data.ticker, `${data.shares} shares at ${data.averageCost}`);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Stock.update(id, data),
    onSuccess: (_, { data }) => {
      stockLogger.logUpdate(data.ticker, `Updated position`);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Stock.delete(id),
    onSuccess: () => {
      stockLogger.logDelete(deleteTarget?.ticker, 'Position removed');
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const tickerUpper = formData.ticker?.toUpperCase();
    const enrichedSector = formData.sector || stockPrices[tickerUpper]?.sector;
    const payload = { ...formData, ticker: tickerUpper };
    if (enrichedSector) payload.sector = enrichedSector;
    if (formData.id) {
      const { id, ...data } = payload;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (stock) => {
    setFormData(stock);
    setDialogOpen(true);
  };

  const total = pagination?.total ?? stocks.length;
  const maxPage = pagination?.limit ? Math.ceil(total / pagination.limit || 1) : undefined;
  const showingStart = (page - 1) * limit + 1;
  const showingEnd = showingStart + stocks.length - 1;

  // Lookup ticker info from Yahoo Finance
  const lookupRequestId = useRef(0);
  const lookupTicker = useCallback(async (tickerInput) => {
    const trimmed = tickerInput?.trim();
    if (!trimmed || trimmed.length < 3) return;
    const ticker = trimmed.toUpperCase();
    const requestId = ++lookupRequestId.current;

    setTickerLookupLoading(true);
    setTickerError('');
    try {
      const data = await pricingAPI.getStockPrice(ticker);
      // Ignore stale responses
      if (lookupRequestId.current !== requestId) return;
      if (data) {
        setFormData(prev => ({
          ...prev,
          ticker,
          companyName: data.name || data.shortName || prev.companyName || '',
          sector: data.sector || prev.sector || '',
          currency: data.currency || prev.currency || 'USD',
          currentPrice: data.price ?? prev.currentPrice
        }));
      }
    } catch (error) {
      setTickerError(error?.message || 'Ticker lookup failed');
    } finally {
      setTickerLookupLoading(false);
    }
  }, []);

  // Handle form field changes with auto-lookup for ticker
  const handleFieldChange = useCallback((name, value) => {
    setFormData(prev => {
      if (name === 'ticker') {
        setTickerError('');
        return {
          ...prev,
          ticker: value?.toUpperCase(),
          companyName: '',
          sector: '',
          currentPrice: null
        };
      }
      return { ...prev, [name]: value };
    });

    // Auto-lookup when ticker changes; debounce and require at least 3 chars
    if (name === 'ticker') {
      if (tickerLookupRef.current) {
        clearTimeout(tickerLookupRef.current);
      }
      if (value && value.trim().length >= 3) {
        tickerLookupRef.current = setTimeout(() => {
          lookupTicker(value.trim());
        }, 1000); // allow user to finish typing before lookup
      }
    }
  }, [lookupTicker, tickerLookupRef]);

  // Auto-enrich sector on edit if missing
  const editLookupTriggered = useRef(false);
  if (dialogOpen && formData.ticker && !formData.sector && !editLookupTriggered.current) {
    editLookupTriggered.current = true;
    lookupTicker(formData.ticker);
  }
  if (!dialogOpen && editLookupTriggered.current) {
    editLookupTriggered.current = false;
  }

  // Cleanup any pending ticker lookups on unmount
  useEffect(() => {
    return () => {
      if (tickerLookupRef.current) clearTimeout(tickerLookupRef.current);
    };
  }, []);

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchesAccount = accountFilter ? s.account === accountFilter : true;
      const matchesSector = sectorFilter ? (s.sector || '').toUpperCase() === sectorFilter.toUpperCase() : true;
      return matchesAccount && matchesSector;
    });
  }, [stocks, accountFilter, sectorFilter]);

  const sortedStocks = useMemo(() => {
    const copy = [...filteredStocks];
    const getCompanyName = (stock) => {
      const yahooData = stockPrices[stock.ticker] || {};
      return (stock.companyName || yahooData.name || yahooData.shortName || stock.ticker || '').toString().toUpperCase();
    };
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'marketValue') {
        const va = convertToUSD((Number(a.shares) || 0) * getCurrentPrice(a), a.currency);
        const vb = convertToUSD((Number(b.shares) || 0) * getCurrentPrice(b), b.currency);
        return (va - vb) * dir;
      }
      if (sortKey === 'gainLoss') {
        const pa = getCurrentPrice(a);
        const pb = getCurrentPrice(b);
        const ca = Number(a.averageCost) || 0;
        const cb = Number(b.averageCost) || 0;
        const sa = Number(a.shares) || 0;
        const sb = Number(b.shares) || 0;
        const ga = convertToUSD(sa * (pa - ca), a.currency);
        const gb = convertToUSD(sb * (pb - cb), b.currency);
        return (ga - gb) * dir;
      }
      if (sortKey === 'companyName') {
        return getCompanyName(a).localeCompare(getCompanyName(b)) * dir;
      }
      if (sortKey === 'account') {
        const av = (a.account || '').toString().toUpperCase();
        const bv = (b.account || '').toString().toUpperCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      }
      const av = (a[sortKey] || '').toString().toUpperCase();
      const bv = (b[sortKey] || '').toString().toUpperCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return copy;
  }, [filteredStocks, sortKey, sortDir, stockPrices, getCurrentPrice, convertToUSD]);

  const columns = [
    {
      key: 'ticker',
      label: 'Ticker',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-slate-900">{val}</span>
      )
    },
    {
      key: 'companyName',
      label: 'Company',
      sortable: true,
      render: (_, row) => {
        const yahooData = stockPrices[row.ticker];
        const companyName = row.companyName || yahooData?.name || yahooData?.shortName || row.ticker;
        const sector = row.sector || yahooData?.sector;
        return (
          <div>
            <p className="text-sm font-medium text-slate-900">{companyName}</p>
            {sector && (
              <p className="text-xs text-slate-400">{sector}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'shares',
      label: 'Shares',
      align: 'right',
      render: (val) => (val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    },
    {
      key: 'averageCost',
      label: 'Avg Cost',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return `${symbol}${(Number(val) || 0).toFixed(2)}`;
      }
    },
    {
      key: 'currentPrice',
      label: 'Current',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const price = getCurrentPrice(row);
        const isLive = stockPrices[row.ticker]?.price && !row.currentPrice;
        return (
          <div className="flex items-center justify-end gap-1">
            <span>{symbol}{(price || 0).toFixed(2)}</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Live price" />}
          </div>
        );
      }
    },
    {
      key: 'marketValue',
      label: 'Market Value (USD)',
      align: 'right',
      sortable: true,
      render: (_, row) => {
        const price = getCurrentPrice(row);
        const value = (Number(row.shares) || 0) * price;
        const valueUSD = convertToUSD(value, row.currency);
        return <span className="font-medium">${valueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    {
      key: 'gainLoss',
      label: 'Gain/Loss',
      align: 'right',
      sortable: true,
      render: (_, row) => {
        const price = getCurrentPrice(row);
        const shares = Number(row.shares) || 0;
        const avgCost = Number(row.averageCost) || 0;
        const cost = shares * avgCost;
        const value = shares * price;
        const gain = value - cost;
        const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : '0.0';
        const isPositive = gain >= 0;
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return (
          <div className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            <span className="font-medium">{isPositive ? '+' : ''}{gainPct}%</span>
            <p className="text-xs">{symbol}{Math.abs(gain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        );
      }
    },
    // Currency removed from table per request
    { 
      key: 'account', 
      label: 'Account',
      sortable: true,
      render: (val) => val ? (
        <Badge variant="outline" className="font-normal">
          {val}
        </Badge>
      ) : '-'
    }
  ];

  // Calculate totals in USD
  const totalValueUSD = stocks.reduce((sum, s) => {
    const price = getCurrentPrice(s);
    const value = (Number(s.shares) || 0) * price;
    return sum + convertToUSD(value || 0, s.currency);
  }, 0);
  const totalPositions = total || stocks.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Stocks"
          subtitle={
            <div className="flex items-center gap-2">
              <span>{totalPositions} positions • ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD</span>
              {isLoadingPrices && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
          }
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Stock"
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <select
            className="border rounded-md px-3 py-2 text-sm text-slate-700 w-full sm:w-52"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
              setSortKey('ticker');
              setSortDir('asc');
            }}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm text-slate-700 w-full sm:w-52"
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(1);
              setSortKey('ticker');
              setSortDir('asc');
            }}
          >
            <option value="">All Sectors</option>
            {sectorOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <AssetTable
          columns={columns}
          data={sortedStocks}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onSort={(key, dir) => {
            setSortKey(key);
            setSortDir(dir);
          }}
          sortKey={sortKey}
          sortDir={sortDir}
          emptyMessage="No stocks in your portfolio yet"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <div className="text-sm text-slate-500">
            Showing {stocks.length === 0 ? 0 : showingStart} - {stocks.length === 0 ? 0 : showingEnd} of {total || '...'}
          </div>
          <div className="flex items-center gap-3">
            <select
              className="border rounded-md px-3 py-2 text-sm text-slate-700"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || stocksLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={stocksLoading || (maxPage ? page >= maxPage : stocks.length < limit)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Stock' : (tickerLookupLoading ? 'Add Stock (looking up...)' : 'Add Stock')}
          fields={stockFields}
          data={formData}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
          errorMessage={tickerError}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Stock</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.ticker}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
