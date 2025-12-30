import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import PaginationControls from '@/components/portfolio/PaginationControls';
import type { CashDeposit, Account } from '@/types';
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

const cashLogger = createChangeLogger('Cash/Deposit');

const DEPOSIT_TYPES = ['Cash', 'Savings Account', 'Fixed Deposit', 'Money Market', 'CD', 'Other'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'] as const;

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

type CashDepositFormData = Partial<CashDeposit> & {
  [key: string]: unknown;
};

type CashDepositFormData = Partial<CashDeposit> & {
  [key: string]: unknown;
};

const getCashFields = (accounts: Account[]) => [
  { name: 'name', label: 'Name', required: true, placeholder: 'Emergency Fund' },
  { name: 'depositType', label: 'Type', type: 'select', options: DEPOSIT_TYPES },
  { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '50000' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true },
  { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturityDate', label: 'Maturity Date', type: 'date' },
  { name: 'account', label: 'Institution', type: 'select', options: accounts.map(a => a.name), allowCustom: true, required: true },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

const parseNumber = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const cleaned = typeof val === 'string' ? val.replace(/,/g, '').trim() : val;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

export default function CashDeposits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CashDepositFormData>({});
  const [deleteTarget, setDeleteTarget] = useState<CashDeposit | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [accountFilter, setAccountFilter] = useState<string>('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('');
  
  const queryClient = useQueryClient();

  const { data: depositsResponse = [], isFetching: depositsLoading, isError: depositsError, error: depositsErrorObj } = useQuery<PaginatedResponse<CashDeposit> | CashDeposit[], Error>({
    queryKey: ['cashDeposits', page, limit, accountFilter, currencyFilter],
    queryFn: () => entities.CashDeposit.listWithPagination({ page, limit, account: accountFilter || undefined, currency: currencyFilter || undefined }),
    placeholderData: keepPreviousData
  });

  const deposits = Array.isArray(depositsResponse)
    ? depositsResponse as CashDeposit[]
    : (depositsResponse as PaginatedResponse<CashDeposit>)?.data || [];
  const pagination = !Array.isArray(depositsResponse)
    ? (depositsResponse as PaginatedResponse<CashDeposit>)?.pagination || { total: deposits.length, page, limit }
    : { total: deposits.length, page, limit };

  const { data: accounts = [], isError: accountsError, error: accountsErrorObj } = useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const cashFields = getCashFields(accounts);
  const { convertToUSD = (value: number) => value } = useExchangeRates() || {};
  const loadError = depositsError ? (depositsErrorObj?.message || 'Failed to load cash & deposits') : accountsError ? (accountsErrorObj?.message || 'Failed to load accounts') : '';

  const createMutation = useMutation({
    mutationFn: (data: Partial<CashDeposit>) => entities.CashDeposit.create(data),
    onSuccess: (_, data) => {
      cashLogger.logCreate(data.name, `${data.depositType || 'Cash'} - ${data.amount}`);
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
      setSubmitError('');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to add cash/deposit. Please try again.';
      setSubmitError(message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<CashDeposit> }) => entities.CashDeposit.update(id, data),
    onSuccess: (_, { data }) => {
      cashLogger.logUpdate(data.name, 'Updated');
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
      setSubmitError('');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update cash/deposit. Please try again.';
      setSubmitError(message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.CashDeposit.delete(id),
    onSuccess: () => {
      cashLogger.logDelete(deleteTarget?.name, 'Removed');
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    const { name, amount, account, currency } = formData;
    const numericAmount = parseNumber(amount);
    if (!name || !account || !currency || amount === undefined || amount === null || amount === '') {
      setSubmitError('Please fill in Name, Amount, Currency, and Institution.');
      return;
    }
    if (!Number.isFinite(numericAmount) || (numericAmount ?? 0) <= 0) {
      setSubmitError('Amount must be greater than zero.');
      return;
    }

    const { id, ...dataWithoutId } = formData;
    const payload: Partial<CashDeposit> & Record<string, unknown> = { ...dataWithoutId };

    let hasNumberError = false;
    (['amount', 'interestRate'] as const).forEach((key) => {
      const value = payload[key];
      if (value === '' || value === undefined || value === null) {
        delete payload[key];
      } else {
        const num = parseNumber(value);
        if (!Number.isFinite(num)) {
          setSubmitError(`Invalid number for ${key === 'amount' ? 'Amount' : 'Interest Rate'}. Use digits only.`);
          hasNumberError = true;
        }
        payload[key] = num as number;
      }
    });
    if (hasNumberError) return;

    if (payload.maturityDate === '' || payload.maturityDate === undefined) delete payload.maturityDate;
    if (payload.notes === '') delete payload.notes;
    if (payload.depositType === '') delete payload.depositType;

    payload.currency = currency || 'USD';

    if (id) {
      updateMutation.mutate({ id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (deposit: CashDeposit) => {
    setFormData(deposit);
    setDialogOpen(true);
  };

  const getTypeColor = (type?: string | null) => {
    const colors = {
      'Cash': 'bg-emerald-100 text-emerald-700',
      'Savings Account': 'bg-blue-100 text-blue-700',
      'Fixed Deposit': 'bg-violet-100 text-violet-700',
      'Money Market': 'bg-cyan-100 text-cyan-700',
      'CD': 'bg-amber-100 text-amber-700',
      'Other': 'bg-slate-100 text-slate-700'
    };
    return colors[type as keyof typeof colors] || colors['Other'];
  };

  const columns: TableColumn<CashDeposit>[] = [
    { 
      key: 'name', 
      label: 'Name',
      render: (val: CashDeposit['name'], row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.account && (
            <p className="text-sm text-slate-500">{row.account}</p>
          )}
        </div>
      )
    },
    { 
      key: 'depositType', 
      label: 'Type',
      render: (val: CashDeposit['depositType']) => val && (
        <Badge className={`${getTypeColor(val)} font-medium`}>
          {val}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (val: CashDeposit['amount'], row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return <span className="font-semibold">{symbol}{(Number(val) || 0).toLocaleString()}</span>;
      }
    },
    { 
      key: 'interestRate', 
      label: 'Interest',
      align: 'right',
      render: (val: CashDeposit['interestRate']) => val ? (
        <span className="text-emerald-600 font-medium">{val}%</span>
      ) : '-'
    },
    { 
      key: 'maturityDate', 
      label: 'Maturity',
      render: (val: CashDeposit['maturityDate']) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'currency', 
      label: 'Ccy',
      render: (val: CashDeposit['currency']) => (
        <Badge variant="outline" className="font-normal text-xs">
          {val || 'USD'}
        </Badge>
      )
    }
  ];

  const totalValueUSD = deposits.reduce((sum, d) => {
    return sum + convertToUSD(Number(d.amount) || 0, d.currency);
  }, 0);
  const totalCount = pagination?.total ?? deposits.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Cash & Deposits"
          subtitle={`${totalCount} positions • $${totalValueUSD.toLocaleString()} USD`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Cash/Deposit"
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
          data={deposits}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No cash or deposits in your portfolio yet"
        />

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={deposits.length}
          loading={depositsLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Cash/Deposit' : 'Add Cash/Deposit'}
          fields={cashFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
          errorMessage={submitError}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Cash/Deposit</AlertDialogTitle>
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
