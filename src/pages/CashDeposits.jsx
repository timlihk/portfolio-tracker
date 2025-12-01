import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useExchangeRates, CURRENCY_SYMBOLS } from '@/components/portfolio/useMarketData';
import { createChangeLogger } from '@/components/portfolio/useChangelog';
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
  { name: 'deposit_type', label: 'Type', type: 'select', options: DEPOSIT_TYPES },
  { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: '50000' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES },
  { name: 'interest_rate', label: 'Interest Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturity_date', label: 'Maturity Date', type: 'date' },
  { name: 'account', label: 'Institution', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function CashDeposits() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: deposits = [] } = useQuery({
    queryKey: ['cashDeposits'],
    queryFn: () => entities.CashDeposit.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => entities.Account.list()
  });

  const cashFields = getCashFields(accounts);
  const { convertToUSD } = useExchangeRates();

  const createMutation = useMutation({
    mutationFn: (data) => entities.CashDeposit.create(data),
    onSuccess: (_, data) => {
      cashLogger.logCreate(data.name, `${data.deposit_type || 'Cash'} - ${data.amount}`);
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.CashDeposit.update(id, data),
    onSuccess: (_, { data }) => {
      cashLogger.logUpdate(data.name, 'Updated');
      queryClient.invalidateQueries({ queryKey: ['cashDeposits'] });
      setDialogOpen(false);
      setFormData({});
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
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
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
      key: 'deposit_type', 
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
      key: 'interest_rate', 
      label: 'Interest',
      align: 'right',
      render: (val) => val ? (
        <span className="text-emerald-600 font-medium">{val}%</span>
      ) : '-'
    },
    { 
      key: 'maturity_date', 
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

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Cash & Deposits"
          subtitle={`${deposits.length} positions • $${totalValueUSD.toLocaleString()} USD`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Cash/Deposit"
        />

        <AssetTable
          columns={columns}
          data={deposits}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No cash or deposits in your portfolio yet"
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