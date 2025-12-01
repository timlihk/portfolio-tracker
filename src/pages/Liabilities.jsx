import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
import { format } from 'date-fns';
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

const LIABILITY_TYPES = ['Margin Loan', 'Securities-Backed Line', 'Investment Loan', 'Portfolio Line of Credit', 'Other'];
const RATE_TYPES = ['Fixed', 'Variable', 'SOFR+Spread', 'Prime+Spread'];
const STATUSES = ['Active', 'Paid Off', 'In Default'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'ILS', 'HKD'];

const getLiabilityFields = (accounts) => [
  { name: 'name', label: 'Loan Name', required: true, placeholder: 'Margin Loan - Schwab' },
  { name: 'liability_type', label: 'Type', type: 'select', options: LIABILITY_TYPES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'principal', label: 'Original Principal', type: 'number', placeholder: '100000' },
  { name: 'outstanding_balance', label: 'Outstanding Balance', type: 'number', required: true, placeholder: '85000' },
  { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '6.5' },
  { name: 'rate_type', label: 'Rate Type', type: 'select', options: RATE_TYPES },
  { name: 'collateral', label: 'Collateral', placeholder: 'Stock portfolio' },
  { name: 'start_date', label: 'Start Date', type: 'date' },
  { name: 'maturity_date', label: 'Maturity Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Liabilities() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: liabilities = [] } = useQuery({
    queryKey: ['liabilities'],
    queryFn: () => entities.Liability.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const liabilityFields = getLiabilityFields(accounts);
  const { convertToUSD } = useExchangeRates() || { convertToUSD: (v) => v };

  const createMutation = useMutation({
    mutationFn: (data) => entities.Liability.create(data),
    onSuccess: (_, data) => {
      liabilityLogger.logCreate(data.name, `${data.outstanding_balance} ${data.currency || 'USD'}`);
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Liability.update(id, data),
    onSuccess: (_, { data }) => {
      liabilityLogger.logUpdate(data.name, 'Updated loan');
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Liability.delete(id),
    onSuccess: () => {
      liabilityLogger.logDelete(deleteTarget?.name, 'Loan removed');
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
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

  const handleEdit = (liability) => {
    setFormData(liability);
    setDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-amber-100 text-amber-800';
      case 'Paid Off': return 'bg-emerald-100 text-emerald-800';
      case 'In Default': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Loan',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.liability_type && (
            <p className="text-sm text-slate-500">{row.liability_type}</p>
          )}
        </div>
      )
    },
    { 
      key: 'account', 
      label: 'Account',
      render: (val) => val ? (
        <Badge variant="outline" className="font-normal">{val}</Badge>
      ) : '-'
    },
    {
      key: 'outstanding_balance',
      label: 'Outstanding',
      align: 'right',
      render: (val, row) => {
        const symbol = CURRENCY_SYMBOLS[row.currency] || '$';
        return <span className="font-medium text-rose-600">{symbol}{(Number(val) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    { 
      key: 'interest_rate', 
      label: 'Rate',
      align: 'right',
      render: (val, row) => val ? (
        <div>
          <span className="font-medium">{val}%</span>
          {row.rate_type && <p className="text-xs text-slate-500">{row.rate_type}</p>}
        </div>
      ) : '-'
    },
    { 
      key: 'maturity_date', 
      label: 'Maturity',
      render: (val) => val ? format(new Date(val), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => (
        <Badge className={getStatusColor(val)}>{val || 'Active'}</Badge>
      )
    },
    { 
      key: 'currency', 
      label: 'Ccy',
      render: (val) => (
        <Badge variant="outline" className="font-normal text-xs">{val || 'USD'}</Badge>
      )
    }
  ];

  const activeLiabilities = liabilities.filter(l => l.status !== 'Paid Off');
  const totalOutstandingUSD = activeLiabilities.reduce((sum, l) => {
    return sum + convertToUSD(Number(l.outstanding_balance) || 0, l.currency);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Liabilities"
          subtitle={`${activeLiabilities.length} active loans • $${totalOutstandingUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD outstanding`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Loan"
        />

        <AssetTable
          columns={columns}
          data={liabilities}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No liabilities recorded"
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