import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useExchangeRates, useBondPrices, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import { RefreshCw } from 'lucide-react';
import PaginationControls from '@/components/portfolio/PaginationControls';

const bondLogger = createChangeLogger('Bond');
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

const BOND_TYPES = ['Treasury', 'Corporate', 'Municipal', 'Agency', 'International', 'High Yield', 'Other'];
const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'NR'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

const getBondFields = (accounts) => [
  { name: 'name', label: 'Bond Name / Issuer', required: true, placeholder: 'US Treasury 10Y' },
  { name: 'isin', label: 'ISIN', placeholder: 'US912810RZ49 (12 characters)' },
  { name: 'bondType', label: 'Bond Type', type: 'select', options: BOND_TYPES },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'faceValue', label: 'Face Value', type: 'number', required: true, placeholder: '10000' },
  { name: 'purchasePrice', label: 'Purchase Price', type: 'number', required: true, placeholder: '9800' },
  { name: 'currentValue', label: 'Current Value (leave empty for estimate)', type: 'number', placeholder: 'Auto-estimated' },
  { name: 'couponRate', label: 'Coupon Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturityDate', label: 'Maturity Date', type: 'date' },
  { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { name: 'rating', label: 'Credit Rating', type: 'select', options: RATINGS },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Bonds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const queryClient = useQueryClient();

  const { data: bondResponse, isFetching: bondsLoading } = useQuery({
    queryKey: ['bonds', page, limit],
    queryFn: () => entities.Bond.listWithPagination({ page, limit }),
    keepPreviousData: true
  });
  const bonds = bondResponse?.data || [];
  const pagination = bondResponse?.pagination || { total: bonds.length, page, limit };

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const bondFields = getBondFields(accounts);

  // Get real-time bond values and exchange rates
  const { prices: bondPrices, loading: pricesLoading } = useBondPrices(bonds);
  const { convertToUSD, loading: ratesLoading } = useExchangeRates();

  const isLoadingPrices = pricesLoading || ratesLoading;

  // Helper to get current value (estimated or manual)
  // Note: PostgreSQL returns DECIMAL as strings, so we need to convert to numbers
  const getCurrentValue = (bond) => Number(bondPrices[bond.name]) || Number(bond.currentValue) || Number(bond.purchasePrice) || 0;

  const createMutation = useMutation({
    mutationFn: (data) => entities.Bond.create(data),
    onSuccess: (_, data) => {
      bondLogger.logCreate(data.name, `Face value ${data.faceValue}`);
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Bond.update(id, data),
    onSuccess: (_, { data }) => {
      bondLogger.logUpdate(data.name, 'Updated position');
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Bond.delete(id),
    onSuccess: () => {
      bondLogger.logDelete(deleteTarget?.name, 'Position removed');
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
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

  const handleEdit = (bond) => {
    setFormData(bond);
    setDialogOpen(true);
  };

  const getRatingColor = (rating) => {
    if (!rating) return 'bg-slate-100 text-slate-700';
    if (['AAA', 'AA', 'A'].includes(rating)) return 'bg-emerald-100 text-emerald-700';
    if (['BBB', 'BB'].includes(rating)) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Bond',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.isin && (
            <p className="text-xs text-slate-400 font-mono">{row.isin}</p>
          )}
          {row.bondType && !row.isin && (
            <p className="text-sm text-slate-500">{row.bondType}</p>
          )}
        </div>
      )
    },
    {
      key: 'faceValue',
      label: 'Face Value',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return `${symbol}${(Number(val) || 0).toLocaleString()}`;
      }
    },
    {
      key: 'currentValue',
      label: 'Current Value',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const value = getCurrentValue(row);
        const isLive = bondPrices[row.name] && !row.currentValue;
        return (
          <div className="flex items-center justify-end gap-1">
            <span className="font-medium">{symbol}{value.toLocaleString()}</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Estimated value" />}
          </div>
        );
      }
    },
    { 
      key: 'couponRate', 
      label: 'Coupon',
      align: 'right',
      render: (val) => val ? `${val}%` : '-'
    },
    { 
      key: 'maturityDate', 
      label: 'Maturity',
      render: (val) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'rating', 
      label: 'Rating',
      render: (val) => val && (
        <Badge className={`${getRatingColor(val)} font-medium`}>
          {val}
        </Badge>
      )
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

  // Calculate total in USD
  const totalValueUSD = bonds.reduce((sum, b) => {
    const value = getCurrentValue(b);
    return sum + convertToUSD(value, b.currency);
  }, 0);
  const totalPositions = pagination?.total ?? bonds.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Bonds"
          subtitle={
            <div className="flex items-center gap-2">
              <span>{totalPositions} bonds • ${totalValueUSD.toLocaleString()} USD</span>
              {isLoadingPrices && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
          }
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Bond"
        />

        <AssetTable
          columns={columns}
          data={bonds}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No bonds in your portfolio yet"
        />

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={bonds.length}
          loading={bondsLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit Bond' : 'Add Bond'}
          fields={bondFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Bond</AlertDialogTitle>
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
