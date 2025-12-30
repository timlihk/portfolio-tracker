import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import { format } from 'date-fns';
import PaginationControls from '@/components/portfolio/PaginationControls';
import type { Liability, Account } from '@/types';
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

const liabilityLogger = createChangeLogger('Liability');

const LIABILITY_TYPES = ['Margin Loan', 'Securities-Backed Line', 'Investment Loan', 'Portfolio Line of Credit', 'Other'] as const;
const RATE_TYPES = ['Fixed', 'Variable', 'SOFR+Spread', 'Prime+Spread'] as const;
const STATUSES = ['Active', 'Paid Off', 'In Default'] as const;
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

type LiabilityFormData = Partial<Liability> & {
  [key: string]: unknown;
};

const getLiabilityFields = (accounts: Account[]) => [
  { name: 'name', label: 'Loan Name', required: true, placeholder: 'Margin Loan - Schwab' },
  { name: 'liabilityType', label: 'Type', type: 'select', options: LIABILITY_TYPES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'principal', label: 'Original Principal', type: 'number', placeholder: '100000' },
  { name: 'outstandingBalance', label: 'Outstanding Balance', type: 'number', required: true, placeholder: '85000' },
  { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', placeholder: '6.5' },
  { name: 'rateType', label: 'Rate Type', type: 'select', options: RATE_TYPES },
  { name: 'collateral', label: 'Collateral', placeholder: 'Stock portfolio' },
  { name: 'startDate', label: 'Start Date', type: 'date' },
  { name: 'maturityDate', label: 'Maturity Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Liabilities() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LiabilityFormData>({});
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  
  const queryClient = useQueryClient();

  const { data: liabilitiesResponse = [], isFetching: liabilitiesLoading, isError: liabilitiesError, error: liabilitiesErrorObj } = useQuery<PaginatedResponse<Liability> | Liability[], Error>({
    queryKey: ['liabilities', page, limit, accountFilter, currencyFilter],
    queryFn: () => entities.Liability.listWithPagination({ page, limit, account: accountFilter || undefined, currency: currencyFilter || undefined }),
    placeholderData: keepPreviousData
  });
  const liabilities = Array.isArray(liabilitiesResponse)
    ? liabilitiesResponse as Liability[]
    : (liabilitiesResponse as PaginatedResponse<Liability>)?.data || [];
  const pagination = !Array.isArray(liabilitiesResponse)
    ? (liabilitiesResponse as PaginatedResponse<Liability>)?.pagination || { total: liabilities.length, page, limit }
    : { total: liabilities.length, page, limit };

  const { data: accounts = [], isError: accountsError, error: accountsErrorObj } = useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const liabilityFields = getLiabilityFields(accounts);
  const { convertToUSD = (value: number) => value } = useExchangeRates() || {};

  const createMutation = useMutation({
    mutationFn: (data: Partial<Liability>) => entities.Liability.create(data),
    onSuccess: (_, data) => {
      liabilityLogger.logCreate(data.name, `${data.outstandingBalance} ${data.currency || 'USD'}`);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Liability> }) => entities.Liability.update(id, data),
    onSuccess: (_, { data }) => {
      liabilityLogger.logUpdate(data.name, 'Updated loan');
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.Liability.delete(id),
    onSuccess: () => {
      liabilityLogger.logDelete(deleteTarget?.name, 'Loan removed');
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (liability: Liability) => {
    setFormData(liability);
    setDialogOpen(true);
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'Active': return 'bg-amber-100 text-amber-800';
      case 'Paid Off': return 'bg-emerald-100 text-emerald-800';
      case 'In Default': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const columns: TableColumn<Liability>[] = [
    { 
      key: 'name', 
      label: 'Loan',
      render: (val: Liability['name'], row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.liabilityType && (
            <p className="text-sm text-slate-500">{row.liabilityType}</p>
          )}
        </div>
      )
    },
    { 
      key: 'account', 
      label: 'Account',
      render: (val: Liability['account']) => val ? (
        <Badge variant="outline" className="font-normal">{val}</Badge>
      ) : '-'
    },
    {
      key: 'outstandingBalance',
      label: 'Outstanding',
      align: 'right',
      render: (val: Liability['outstandingBalance'], row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return <span className="font-medium text-rose-600">{symbol}{(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    { 
      key: 'interestRate', 
      label: 'Rate',
      align: 'right',
      render: (val: Liability['interestRate'], row) => val ? (
        <div>
          <span className="font-medium">{val}%</span>
          {row.rateType && <p className="text-xs text-slate-500">{row.rateType}</p>}
        </div>
      ) : '-'
    },
    { 
      key: 'maturityDate', 
      label: 'Maturity',
      render: (val: Liability['maturityDate']) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: Liability['status']) => (
        <Badge className={getStatusColor(val)}>{val || 'Active'}</Badge>
      )
    },
    { 
      key: 'currency', 
      label: 'Ccy',
      render: (val: Liability['currency']) => (
        <Badge variant="outline" className="font-normal text-xs">{val || 'USD'}</Badge>
      )
    }
  ];

  const activeLiabilities = liabilities.filter(l => l.status !== 'Paid Off');
  const totalOutstandingUSD = activeLiabilities.reduce((sum, l) => {
    return sum + convertToUSD(Number(l.outstandingBalance) || 0, l.currency);
  }, 0);
  const totalCount = pagination?.total ?? liabilities.length;
  const loadError = liabilitiesError
    ? (liabilitiesErrorObj?.message || 'Failed to load liabilities')
    : accountsError
      ? (accountsErrorObj?.message || 'Failed to load accounts')
      : '';

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Liabilities"
          subtitle={`${activeLiabilities.length} active loans • $${totalOutstandingUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD outstanding • ${totalCount} total`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Loan"
        />
        {loadError && (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <select
            className="border rounded-md px-3 py-2 text-sm text-slate-700 w-full sm:w-52"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
          <select
            className="border rounded-md px-3 py-2 text-sm text-slate-700 w-full sm:w-52"
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Currencies</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <AssetTable
          columns={columns}
          data={liabilities}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No liabilities recorded"
        />

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={liabilities.length}
          loading={liabilitiesLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Liability' : 'Add Liability'}
          fields={liabilityFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Liability</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
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
