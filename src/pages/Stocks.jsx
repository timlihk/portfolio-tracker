import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
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
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

const getStockFields = (accounts) => [
  { name: 'ticker', label: 'Ticker Symbol', required: true, placeholder: 'AAPL' },
  { name: 'company_name', label: 'Company Name', placeholder: 'Apple Inc.' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'shares', label: 'Number of Shares', type: 'number', required: true, placeholder: '100' },
  { name: 'average_cost', label: 'Average Cost per Share', type: 'number', required: true, placeholder: '150.00' },
  { name: 'current_price', label: 'Current Price (leave empty for live)', type: 'number', placeholder: 'Auto-fetched' },
  { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
  { name: 'sector', label: 'Sector', type: 'select', options: SECTORS },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Stocks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: stocks = [] } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const stockFields = getStockFields(accounts);

  // Get real-time prices and exchange rates
  const stockTickers = useMemo(() => stocks.map(s => s.ticker), [stocks]);
  const { prices: stockPrices, loading: pricesLoading } = useStockPrices(stockTickers);
  const { convertToUSD, loading: ratesLoading } = useExchangeRates();

  const isLoadingPrices = pricesLoading || ratesLoading;

  // Helper to get current price (real-time or manual)
  const getCurrentPrice = (stock) => stockPrices[stock.ticker] || stock.current_price || stock.average_cost || 0;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Stock.create(data),
    onSuccess: (_, data) => {
      stockLogger.logCreate(data.ticker, `${data.shares} shares at ${data.average_cost}`);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
    onSuccess: (_, { data }) => {
      stockLogger.logUpdate(data.ticker, `Updated position`);
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Stock.delete(id),
    onSuccess: () => {
      stockLogger.logDelete(deleteTarget?.ticker, 'Position removed');
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (stock) => {
    setFormData(stock);
    setDialogOpen(true);
  };

  const columns = [
    { 
      key: 'ticker', 
      label: 'Ticker',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.company_name && (
            <p className="text-sm text-slate-500">{row.company_name}</p>
          )}
        </div>
      )
    },
    { 
      key: 'shares', 
      label: 'Shares',
      align: 'right',
      render: (val) => val?.toLocaleString()
    },
    { 
      key: 'average_cost', 
      label: 'Avg Cost',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return `${symbol}${val?.toFixed(2)}`;
      }
    },
    { 
      key: 'current_price', 
      label: 'Current',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const price = getCurrentPrice(row);
        const isLive = stockPrices[row.ticker] && !row.current_price;
        return (
          <div className="flex items-center justify-end gap-1">
            <span>{symbol}{(price || 0).toFixed(2)}</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Live price" />}
          </div>
        );
      }
    },
    { 
      key: 'market_value', 
      label: 'Market Value',
      align: 'right',
      render: (_, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const price = getCurrentPrice(row);
        const value = row.shares * price;
        return <span className="font-medium">{symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    { 
      key: 'gain_loss', 
      label: 'Gain/Loss',
      align: 'right',
      render: (_, row) => {
        const price = getCurrentPrice(row);
        const cost = row.shares * row.average_cost;
        const value = row.shares * price;
        const gain = value - cost;
        const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : 0;
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
    { 
      key: 'currency', 
      label: 'Ccy',
      render: (val) => (
        <Badge variant="outline" className="font-normal text-xs">
          {val || 'USD'}
        </Badge>
      )
    },
    { 
      key: 'account', 
      label: 'Account',
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
    const value = s.shares * price;
    return sum + convertToUSD(value, s.currency);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Stocks"
          subtitle={
            <div className="flex items-center gap-2">
              <span>{stocks.length} positions • ${totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD</span>
              {isLoadingPrices && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
          }
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Stock"
        />

        <AssetTable
          columns={columns}
          data={stocks}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No stocks in your portfolio yet"
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Stock' : 'Add Stock'}
          fields={stockFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
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