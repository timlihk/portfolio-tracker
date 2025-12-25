import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import PaginationControls from '@/components/portfolio/PaginationControls';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import type { LiquidFund } from '@/types';
import type React from 'react';
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

const FUND_TYPES = ['Hedge Fund', 'Fixed Income Fund', 'Closed-End Equity', 'Closed-End Bond', 'Interval Fund', 'Other'] as const;
const STRATEGIES = ['Long/Short Equity', 'Global Macro', 'Event Driven', 'Multi-Strategy', 'Credit', 'Fixed Income', 'Quantitative', 'Distressed', 'Arbitrage', 'Other'] as const;
const REDEMPTION_FREQ = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Locked'] as const;
const STATUSES = ['Active', 'In Redemption', 'Fully Redeemed'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD'] as const;

type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (val: T[keyof T] | undefined, row: T) => React.ReactNode;
};

type PaginatedResponse<T> = {
  data: T[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

const fundFields = [
  { name: 'fundName', label: 'Fund Name', required: true, placeholder: 'Bridgewater Pure Alpha' },
  { name: 'manager', label: 'Fund Manager', placeholder: 'Bridgewater Associates' },
  { name: 'fundType', label: 'Fund Type', type: 'select', options: FUND_TYPES },
  { name: 'strategy', label: 'Strategy', type: 'select', options: STRATEGIES },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true },
  { name: 'investmentAmount', label: 'Investment Amount', type: 'number', required: true, placeholder: '250000' },
  { name: 'currentValue', label: 'Current Value', type: 'number', placeholder: '275000' },
  { name: 'investmentDate', label: 'Investment Date', type: 'date' },
  { name: 'lockupEndDate', label: 'Lock-up End Date', type: 'date' },
  { name: 'redemptionFrequency', label: 'Redemption Frequency', type: 'select', options: REDEMPTION_FREQ },
  { name: 'managementFee', label: 'Management Fee (%)', type: 'number', placeholder: '2.0' },
  { name: 'performanceFee', label: 'Performance Fee (%)', type: 'number', placeholder: '20' },
  { name: 'ytdReturn', label: 'YTD Return (%)', type: 'number', placeholder: '8.5' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function LiquidFunds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<LiquidFund>>({});
  const [deleteTarget, setDeleteTarget] = useState<LiquidFund | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  const queryClient = useQueryClient();
  const { convertToUSD } = useExchangeRates() || { convertToUSD: (value: number, currency?: string) => value };

  const { data: fundsResponse = [], isFetching: isLoading, isError: fundsError, error: fundsErrorObj } = useQuery<PaginatedResponse<LiquidFund> | LiquidFund[]>({
    queryKey: ['liquidFunds', page, limit],
    queryFn: () => entities.LiquidFund.listWithPagination({ page, limit }),
    placeholderData: keepPreviousData
  });
  const funds = Array.isArray(fundsResponse)
    ? fundsResponse as LiquidFund[]
    : (fundsResponse as PaginatedResponse<LiquidFund>)?.data || [];
  const pagination = !Array.isArray(fundsResponse)
    ? (fundsResponse as PaginatedResponse<LiquidFund>)?.pagination || { total: funds.length, page, limit }
    : { total: funds.length, page, limit };
  const loadError = fundsError ? (fundsErrorObj?.message || 'Failed to load liquid funds') : '';

  const createMutation = useMutation({
    mutationFn: (data: Partial<LiquidFund>) => entities.LiquidFund.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<LiquidFund> }) => entities.LiquidFund.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.LiquidFund.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: Partial<LiquidFund> = {
      ...formData,
      currency: formData.currency || 'USD'
    };
    if (formData.id) {
      const { id, ...data } = payload;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (fund: LiquidFund) => {
    setFormData(fund);
    setDialogOpen(true);
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'Hedge Fund': return 'bg-violet-100 text-violet-700';
      case 'Fixed Income Fund': return 'bg-emerald-100 text-emerald-700';
      case 'Closed-End Equity': return 'bg-blue-100 text-blue-700';
      case 'Closed-End Bond': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'In Redemption': return 'bg-amber-100 text-amber-700';
      case 'Fully Redeemed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns: TableColumn<LiquidFund>[] = [
    { 
      key: 'fundName', 
      label: 'Fund',
      render: (val: LiquidFund['fundName'], row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.manager && (
            <p className="text-sm text-slate-500">{row.manager}</p>
          )}
        </div>
      )
    },
    { 
      key: 'fundType', 
      label: 'Type',
      render: (val: LiquidFund['fundType']) => val && (
        <Badge className={`${getTypeColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    },
    { 
      key: 'strategy', 
      label: 'Strategy',
      render: (val: LiquidFund['strategy']) => val || '-'
    },
    {
      key: 'investmentAmount',
      label: 'Invested',
      align: 'right',
      render: (val: LiquidFund['investmentAmount'], row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return `${symbol}${(Number(val) || 0).toLocaleString()}`;
      }
    },
    {
      key: 'currentValue',
      label: 'Current Value',
      align: 'right',
      render: (val: LiquidFund['currentValue'], row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const base = Number(val) || Number(row.investmentAmount) || 0;
        return <span className="font-medium">{symbol}{base.toLocaleString()}</span>;
      }
    },
    {
      key: 'gainLoss',
      label: 'Gain/Loss',
      align: 'right',
      render: (_: unknown, row) => {
        const invested = Number(row.investmentAmount) || 0;
        const current = Number(row.currentValue) || invested;
        const gain = current - invested;
        const gainPct = invested > 0 ? ((gain / invested) * 100).toFixed(1) : 0;
        const isPositive = gain >= 0;
        return (
          <div className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            <span className="font-medium">{isPositive ? '+' : ''}{gainPct}%</span>
            <p className="text-xs">${Math.abs(gain).toLocaleString()}</p>
          </div>
        );
      }
    },
    { 
      key: 'ytdReturn', 
      label: 'YTD',
      align: 'right',
      render: (val: LiquidFund['ytdReturn']) => {
        if (val === undefined || val === null) return '-';
        const isPositive = val >= 0;
        return (
          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            {isPositive ? '+' : ''}{val}%
          </span>
        );
      }
    },
    { 
      key: 'redemptionFrequency', 
      label: 'Redemption',
      render: (val: LiquidFund['redemptionFrequency']) => val || '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: LiquidFund['status']) => val && (
        <Badge className={`${getStatusColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    }
  ];

  const totalInvested = funds.reduce((sum, f) => {
    return sum + convertToUSD(Number(f.investmentAmount) || 0, f.currency);
  }, 0);
  const totalValue = funds.reduce((sum, f) => {
    return sum + convertToUSD(Number(f.currentValue) || Number(f.investmentAmount) || 0, f.currency);
  }, 0);
  const totalCount = pagination?.total ?? funds.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Liquid Funds"
          subtitle={`${totalCount} funds • $${totalInvested.toLocaleString()} invested • $${totalValue.toLocaleString()} current value (USD)`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Fund"
        />
        {loadError && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        <AssetTable
          columns={columns}
          data={funds}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No liquid funds in your portfolio yet"
        />

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={funds.length}
          loading={isLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Liquid Fund' : 'Add Liquid Fund'}
          fields={fundFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Liquid Fund</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.fundName}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
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
