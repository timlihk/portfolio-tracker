// @ts-nocheck
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/portfolio/PageHeader';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import TransactionFilters from '@/components/portfolio/TransactionFilters';
import TransactionAIAnalysis from '@/components/portfolio/TransactionAIAnalysis';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PaginationControls from '@/components/portfolio/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Pencil, Trash2, ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp, Landmark, Briefcase, Building2, Waves } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import type React from 'react';

const logger = createChangeLogger('Transaction');

const ASSET_TYPES = ['Stock', 'Bond', 'PE Fund', 'PE Deal', 'Liquid Fund'];
const TRANSACTION_TYPES = ['Buy', 'Sell', 'Transfer In', 'Transfer Out', 'Dividend', 'Distribution', 'Capital Call', 'Redemption'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS'];

type Transaction = {
  id?: number | string;
  assetType: string;
  assetName: string;
  transactionType: string;
  quantity?: number;
  price?: number;
  totalAmount?: number;
  fees?: number;
  currency?: string;
  account?: string;
  date?: string;
  notes?: string;
};

type TransactionFiltersState = {
  startDate: string;
  endDate: string;
  assetType: string;
  transactionType: string;
  account: string;
};

type AccountOption = { id: number | string; name: string };

const transactionFields = (accounts: AccountOption[]) => [
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'assetType', label: 'Asset Type', type: 'select', options: ASSET_TYPES, required: true },
  { name: 'assetName', label: 'Asset Name', type: 'text', required: true, placeholder: 'e.g., AAPL or Bond Name' },
  { name: 'transactionType', label: 'Transaction Type', type: 'select', options: TRANSACTION_TYPES, required: true },
  { name: 'quantity', label: 'Quantity', type: 'number', placeholder: 'Number of shares/units' },
  { name: 'price', label: 'Price per Unit', type: 'number', placeholder: '0.00' },
  { name: 'totalAmount', label: 'Total Amount', type: 'number', required: true, placeholder: '0.00' },
  { name: 'fees', label: 'Fees', type: 'number', placeholder: '0.00' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' },
];

const typeConfig = {
  'Buy': { icon: ArrowDownLeft, color: 'bg-emerald-100 text-emerald-700', label: 'Buy' },
  'Sell': { icon: ArrowUpRight, color: 'bg-rose-100 text-rose-700', label: 'Sell' },
  'Transfer In': { icon: ArrowDownLeft, color: 'bg-blue-100 text-blue-700', label: 'Transfer In' },
  'Transfer Out': { icon: ArrowUpRight, color: 'bg-orange-100 text-orange-700', label: 'Transfer Out' },
  'Dividend': { icon: TrendingUp, color: 'bg-violet-100 text-violet-700', label: 'Dividend' },
  'Distribution': { icon: TrendingUp, color: 'bg-purple-100 text-purple-700', label: 'Distribution' },
  'Capital Call': { icon: ArrowUpRight, color: 'bg-amber-100 text-amber-700', label: 'Capital Call' },
  'Redemption': { icon: RefreshCw, color: 'bg-cyan-100 text-cyan-700', label: 'Redemption' },
};

const assetIcons = {
  'Stock': TrendingUp,
  'Bond': Landmark,
  'PE Fund': Briefcase,
  'PE Deal': Building2,
  'Liquid Fund': Waves,
};

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [deleteItem, setDeleteItem] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFiltersState>({
    startDate: '',
    endDate: '',
    assetType: 'All',
    transactionType: 'All',
    account: 'All'
  });
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date'),
  });

  const { data: accounts = [] } = useQuery<AccountOption[]>({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list(),
  });

  const normalizeTransaction = (t: Transaction): Transaction => ({
    ...t,
    assetType: t.assetType,
    assetName: t.assetName,
    transactionType: t.transactionType,
    totalAmount: t.totalAmount,
  });

  const normalizedTransactions = useMemo(
    () => transactions.map(normalizeTransaction),
    [transactions]
  );

  const createMutation = useMutation({
    mutationFn: (data: Partial<Transaction>) => base44.entities.Transaction.create(data),
    onSuccess: (_, data) => {
      const normalized = normalizeTransaction(data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      logger.logCreate(`${normalized.transactionType} ${normalized.assetName}`, `${normalized.totalAmount} ${normalized.currency || 'USD'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<Transaction> }) => base44.entities.Transaction.update(id, data),
    onSuccess: (_, { data }) => {
      const normalized = normalizeTransaction(data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      logger.logUpdate(`${normalized.transactionType} ${normalized.assetName}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (deleteItem) {
        logger.logDelete(`${deleteItem.transactionType} ${deleteItem.assetName}`);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.id) {
      await updateMutation.mutateAsync({ id: formData.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setDialogOpen(false);
    setFormData({});
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData(transaction);
    setDialogOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setDeleteItem(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteItem) {
      await deleteMutation.mutateAsync(deleteItem.id as number | string);
      setDeleteDialogOpen(false);
      setDeleteItem(null);
    }
  };

  const filteredTransactions = useMemo(() => {
    return normalizedTransactions.filter((t) => {
      if (filters.startDate && (t.date || '') < filters.startDate) return false;
      if (filters.endDate && (t.date || '') > filters.endDate) return false;
      if (filters.assetType !== 'All' && t.assetType !== filters.assetType) return false;
      if (filters.transactionType !== 'All' && t.transactionType !== filters.transactionType) return false;
      if (filters.account !== 'All' && t.account !== filters.account) return false;
      return true;
    });
  }, [normalizedTransactions, filters]);

  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredTransactions.slice(start, start + limit);
  }, [filteredTransactions, page, limit]);

  const totalVolume = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  const totalFees = filteredTransactions.reduce((sum, t) => sum + (t.fees || 0), 0);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <PageHeader
        title="Transactions"
        subtitle={
          <span>
            {filteredTransactions.length} transactions • ${totalVolume.toLocaleString()} volume • ${totalFees.toLocaleString()} in fees
          </span>
        }
        onAdd={() => { setFormData({ currency: 'USD' }); setDialogOpen(true); }}
        addLabel="Add Transaction"
      />

      <TransactionFilters 
        filters={filters} 
        onFilterChange={setFilters} 
        accounts={accounts}
      />

      <TransactionAIAnalysis transactions={filteredTransactions} />

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No transactions found. Add your first transaction to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Asset</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Quantity</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Price</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Fees</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase">Account</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-slate-400">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredTransactions.length > 0 && paginatedTransactions.map((t) => {
                const config = typeConfig[t.transactionType] || typeConfig['Buy'];
                const TypeIcon = config.icon;
                const AssetIcon = assetIcons[t.assetType] || TrendingUp;
                
                return (
                  <TableRow key={t.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {t.date ? format(new Date(t.date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          <AssetIcon className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{t.assetName}</div>
                          <div className="text-xs text-slate-500">{t.assetType}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", config.color)}>
                        <TypeIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {t.quantity ? t.quantity.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {t.price ? `$${t.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      ${(t.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {t.fees ? `$${t.fees.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {t.account || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                          onClick={() => handleEdit(t)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                          onClick={() => handleDelete(t)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PaginationControls
        page={page}
        limit={limit}
        total={filteredTransactions.length}
        count={paginatedTransactions.length}
        loading={isLoading}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      <AddAssetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={formData.id ? 'Edit Transaction' : 'Add Transaction'}
        fields={transactionFields(accounts)}
        data={formData}
        onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteItem?.transactionType} transaction for {deleteItem?.assetName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
