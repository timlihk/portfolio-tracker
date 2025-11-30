import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
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

const getStockFields = (accounts) => [
  { name: 'ticker', label: 'Ticker Symbol', required: true, placeholder: 'AAPL' },
  { name: 'company_name', label: 'Company Name', placeholder: 'Apple Inc.' },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'shares', label: 'Number of Shares', type: 'number', required: true, placeholder: '100' },
  { name: 'average_cost', label: 'Average Cost per Share', type: 'number', required: true, placeholder: '150.00' },
  { name: 'current_price', label: 'Current Price', type: 'number', placeholder: '175.00' },
  { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
  { name: 'sector', label: 'Sector', type: 'select', options: SECTORS },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Stocks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['stocks'],
    queryFn: () => base44.entities.Stock.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const stockFields = getStockFields(accounts);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Stock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Stock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Stock.delete(id),
    onSuccess: () => {
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
      render: (val) => `$${val?.toFixed(2)}`
    },
    { 
      key: 'current_price', 
      label: 'Current',
      align: 'right',
      render: (val, row) => val ? `$${val.toFixed(2)}` : `$${row.average_cost?.toFixed(2)}`
    },
    { 
      key: 'market_value', 
      label: 'Market Value',
      align: 'right',
      render: (_, row) => {
        const value = row.shares * (row.current_price || row.average_cost);
        return <span className="font-medium">${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
      }
    },
    { 
      key: 'gain_loss', 
      label: 'Gain/Loss',
      align: 'right',
      render: (_, row) => {
        const cost = row.shares * row.average_cost;
        const value = row.shares * (row.current_price || row.average_cost);
        const gain = value - cost;
        const gainPct = cost > 0 ? ((gain / cost) * 100).toFixed(1) : 0;
        const isPositive = gain >= 0;
        return (
          <div className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
            <span className="font-medium">{isPositive ? '+' : ''}{gainPct}%</span>
            <p className="text-xs">${Math.abs(gain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        );
      }
    },
    { 
      key: 'sector', 
      label: 'Sector',
      render: (val) => val && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
          {val}
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

  // Calculate totals
  const totalValue = stocks.reduce((sum, s) => sum + (s.shares * (s.current_price || s.average_cost)), 0);
  const totalCost = stocks.reduce((sum, s) => sum + (s.shares * s.average_cost), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Stocks"
          subtitle={`${stocks.length} positions • $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total value`}
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