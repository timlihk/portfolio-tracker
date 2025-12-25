import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import PaginationControls from '@/components/portfolio/PaginationControls';
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

const DEPOSIT_TYPES = ['Cash', 'Savings Account', 'Fixed Deposit', 'Money Market', 'CD', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

const getCashFields = (accounts) => [
  { name: 'name', label: 'Name', required: true, placeholder: 'Emergency Fund' },
  { name: 'depositType', label: 'Type', type: 'select', options: DEPOSIT_TYPES },
  { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '50000' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true },
  { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturityDate', label: 'Maturity Date', type: 'date' },
  { name: 'account', label: 'Institution', type: 'select', options: accounts.map(a => a.name), allowCustom: true, required: true },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function CashDeposits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [accountFilter, setAccountFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  
  const queryClient = useQueryClient();

  const { data: depositsResponse = [], isFetching: depositsLoading } = useQuery({
    queryKey: ['cashDeposits', page, limit, accountFilter, currencyFilter],
    queryFn: () => entities.CashDeposit.listWithPagination({ page, limit, account: accountFilter || undefined, currency: currencyFilter || undefined }),
    keepPreviousData: true
  });
  const deposits = depositsResponse?.data || depositsResponse || [];
  const pagination = depositsResponse?.pagination || { total: deposits.length, page, limit };

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const cashFields = getCashFields(accounts);
  const { convertToUSD } = useExchangeRates();

  const createMutation = useMutation({
    mutationFn: (data) => entities.CashDeposit.create(data),
    onSuccess: (_, data) => {
      cashLogger.logCreate(data.name, `${data.depositType || 'Cash'} - ${data.amount}`);
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
      setSubmitError('');
    },
    onError: (err) => {
      setSubmitError(err?.message || 'Failed to add cash/deposit. Please try again.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.CashDeposit.update(id, data),
    onSuccess: (_, { data }) => {
      cashLogger.logUpdate(data.name, 'Updated');
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
      setSubmitError('');
    },
    onError: (err) => {
      setSubmitError(err?.message || 'Failed to update cash/deposit. Please try again.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.CashDeposit.delete(id),
    onSuccess: () => {
      cashLogger.logDelete(deleteTarget?.name, 'Removed');
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    const parseNumber = (val) => {
      if (val === undefined || val === null || val === '') return null;
      const cleaned = typeof val === 'string' ? val.replace(/,/g, '').trim() : val;
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : null;
    };

    const { name, amount, account, currency } = formData;
    const numericAmount = parseNumber(amount);
    if (!name || !account || !currency || amount === undefined || amount === null || amount === '') {
      setSubmitError('Please fill in Name, Amount, Currency, and Institution.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmitError('Amount must be greater than zero.');
      return;
    }

    // Build payload without id field for API, stripping empty strings and normalizing numbers
    const { id, ...dataWithoutId } = formData;
    const payload = { ...dataWithoutId };

    // Normalize numeric fields
    let hasNumberError = false;
    ['amount', 'interestRate'].forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      } else {
        const num = parseNumber(payload[key]);
        if (!Number.isFinite(num)) {
          setSubmitError(`Invalid number for ${key === 'amount' ? 'Amount' : 'Interest Rate'}. Use digits only.`);
          hasNumberError = true;
        }
        payload[key] = num;
      }
    });
    if (hasNumberError) return;

    // Drop empty dates/strings
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

  const handleEdit = (deposit) => {
    setFormData(deposit);
    setDialogOpen(true);
  };

  const getTypeColor = (type) => {
    const colors = {
      'Cash': 'bg-emerald-100 text-emerald-700',
      'Savings Account': 'bg-blue-100 text-blue-700',
      'Fixed Deposit': 'bg-violet-100 text-violet-700',
      'Money Market': 'bg-cyan-100 text-cyan-700',
      'CD': 'bg-amber-100 text-amber-700',
      'Other': 'bg-slate-100 text-slate-700'
    };
    return colors[type] || colors['Other'];
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Name',
      render: (val, row) => (
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
      render: (val) => val && (
        <Badge className={`${getTypeColor(val)} font-medium`}>
          {val}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return <span className="font-semibold">{symbol}{(Number(val) || 0).toLocaleString()}</span>;
      }
    },
    { 
      key: 'interestRate', 
      label: 'Interest',
      align: 'right',
      render: (val) => val ? (
        <span className="text-emerald-600 font-medium">{val}%</span>
      ) : '-'
    },
    { 
      key: 'maturityDate', 
      label: 'Maturity',
      render: (val) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'currency', 
      label: 'Ccy',
      render: (val) => (
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
