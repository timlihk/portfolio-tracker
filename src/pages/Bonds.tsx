import { useState } from 'react';
import type React from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
import type { Bond, Account } from '@/types';
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

const bondLogger = createChangeLogger('Bond');

const BOND_TYPES = ['Treasury', 'Corporate', 'Municipal', 'Agency', 'International', 'High Yield', 'Other'];
const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'NR'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

type PaginatedResponse<T> = {
  data: T[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
};

type BondFormData = Partial<Bond> & {
  [key: string]: unknown;
};

type BondPriceData = {
  pricePct?: number;
  source?: string;
};

const getBondFields = (accounts: Account[]) => [
  { name: 'name', label: 'Bond Name / Issuer', required: true, placeholder: 'US Treasury 10Y' },
  { name: 'isin', label: 'ISIN', placeholder: 'US912810RZ49 (12 characters)' },
  { name: 'bondType', label: 'Bond Type', type: 'select', options: BOND_TYPES },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'faceValue', label: 'Face Value (total nominal)', type: 'number', required: true, placeholder: '10000' },
  { name: 'purchasePrice', label: 'Purchase Price (% of par)', type: 'number', required: true, placeholder: '101.131' },
  { name: 'currentValue', label: 'Current Price (% of par, leave empty to auto-fetch)', type: 'number', placeholder: 'Auto-fetched' },
  { name: 'couponRate', label: 'Coupon Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturityDate', label: 'Maturity Date', type: 'date' },
  { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
  { name: 'rating', label: 'Credit Rating', type: 'select', options: RATINGS },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Bonds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BondFormData>({});
  const [deleteTarget, setDeleteTarget] = useState<Bond | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  const queryClient = useQueryClient();

  const { data: bondResponse, isFetching: bondsLoading } = useQuery<PaginatedResponse<Bond>, Error>({
    queryKey: ['bonds', page, limit],
    queryFn: () => entities.Bond.listWithPagination({ page, limit }),
    placeholderData: keepPreviousData
  });
  const bonds = bondResponse?.data || [];
  const pagination = bondResponse?.pagination || { total: bonds.length, page, limit };

  const { data: accounts = [] } = useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const bondFields = getBondFields(accounts);

  // Get real-time bond values and exchange rates
  const { prices: bondPrices = {}, loading: pricesLoading } = useBondPrices(bonds);
  const { convertToUSD = (v: number) => v, loading: ratesLoading = false } = useExchangeRates() || {};

  const isLoadingPrices = pricesLoading || ratesLoading;

  const getBondPriceData = (bond: Bond): BondPriceData | null => {
    const price = bondPrices[bond.id] || bondPrices[bond.isin ?? ''] || bondPrices[bond.name];
    if (price && typeof price === 'object') return price as BondPriceData;
    if (price != null) return { pricePct: Number(price) || 0, source: 'manual' };
    return null;
  };

  const getPricePct = (bond: Bond) => {
    const manual = Number(bond.currentValue);
    const priceData = getBondPriceData(bond);
    const purchasePct = Number(bond.purchasePrice);
    if (Number.isFinite(manual)) return manual;
    if (Number.isFinite(priceData?.pricePct)) return Number(priceData?.pricePct);
    if (Number.isFinite(purchasePct)) return purchasePct;
    return 100;
  };

  const getMarketValue = (bond: Bond) => {
    const face = Number(bond.faceValue) || 0;
    return face * (getPricePct(bond) / 100);
  };

  const getCostBasis = (bond: Bond) => {
    const face = Number(bond.faceValue) || 0;
    const purchasePct = Number(bond.purchasePrice) || 0;
    return face * (purchasePct / 100);
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Bond>) => entities.Bond.create(data),
    onSuccess: (_, data) => {
      bondLogger.logCreate(data.name, `Face value ${data.faceValue}`);
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Bond> }) => entities.Bond.update(id, data),
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id: id as number | string, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (bond: Bond) => {
    setFormData(bond);
    setDialogOpen(true);
  };

  const getRatingColor = (rating?: string | null) => {
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
      key: 'currentPrice',
      label: 'Price (% of par)',
      align: 'right',
      render: (val, row) => {
        const priceData = getBondPriceData(row);
        const pricePct = getPricePct(row);
        const isLive = priceData?.source === 'api';
        return (
          <div className="flex items-center justify-end gap-1 text-sm text-slate-700">
            <span className="font-medium">{pricePct.toFixed(3)}%</span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Live price from Finnhub" />}
          </div>
        );
      }
    },
    {
      key: 'marketValue',
      label: 'Market Value',
      align: 'right',
      render: (_, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        const value = getMarketValue(row);
        return <span className="font-medium">{symbol}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
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
    const value = getMarketValue(b);
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
