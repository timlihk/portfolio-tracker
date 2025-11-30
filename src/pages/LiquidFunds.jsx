import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
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

const FUND_TYPES = ['Hedge Fund', 'Fixed Income Fund', 'Closed-End Equity', 'Closed-End Bond', 'Interval Fund', 'Other'];
const STRATEGIES = ['Long/Short Equity', 'Global Macro', 'Event Driven', 'Multi-Strategy', 'Credit', 'Fixed Income', 'Quantitative', 'Distressed', 'Arbitrage', 'Other'];
const REDEMPTION_FREQ = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Locked'];
const STATUSES = ['Active', 'In Redemption', 'Fully Redeemed'];

const fundFields = [
  { name: 'fund_name', label: 'Fund Name', required: true, placeholder: 'Bridgewater Pure Alpha' },
  { name: 'manager', label: 'Fund Manager', placeholder: 'Bridgewater Associates' },
  { name: 'fund_type', label: 'Fund Type', type: 'select', options: FUND_TYPES },
  { name: 'strategy', label: 'Strategy', type: 'select', options: STRATEGIES },
  { name: 'investment_amount', label: 'Investment Amount', type: 'number', required: true, placeholder: '250000' },
  { name: 'current_value', label: 'Current Value', type: 'number', placeholder: '275000' },
  { name: 'investment_date', label: 'Investment Date', type: 'date' },
  { name: 'lockup_end_date', label: 'Lock-up End Date', type: 'date' },
  { name: 'redemption_frequency', label: 'Redemption Frequency', type: 'select', options: REDEMPTION_FREQ },
  { name: 'management_fee', label: 'Management Fee (%)', type: 'number', placeholder: '2.0' },
  { name: 'performance_fee', label: 'Performance Fee (%)', type: 'number', placeholder: '20' },
  { name: 'ytd_return', label: 'YTD Return (%)', type: 'number', placeholder: '8.5' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function LiquidFunds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: funds = [], isLoading } = useQuery({
    queryKey: ['liquidFunds'],
    queryFn: () => base44.entities.LiquidFund.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LiquidFund.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LiquidFund.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LiquidFund.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidFunds'] });
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

  const handleEdit = (fund) => {
    setFormData(fund);
    setDialogOpen(true);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Hedge Fund': return 'bg-violet-100 text-violet-700';
      case 'Fixed Income Fund': return 'bg-emerald-100 text-emerald-700';
      case 'Closed-End Equity': return 'bg-blue-100 text-blue-700';
      case 'Closed-End Bond': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'In Redemption': return 'bg-amber-100 text-amber-700';
      case 'Fully Redeemed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns = [
    { 
      key: 'fund_name', 
      label: 'Fund',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.manager && (
            <p className="text-sm text-slate-500">{row.manager}</p>
          )}
        </div>
      )
    },
    { 
      key: 'fund_type', 
      label: 'Type',
      render: (val) => val && (
        <Badge className={`${getTypeColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    },
    { 
      key: 'strategy', 
      label: 'Strategy',
      render: (val) => val || '-'
    },
    { 
      key: 'investment_amount', 
      label: 'Invested',
      align: 'right',
      render: (val) => `$${val?.toLocaleString()}`
    },
    { 
      key: 'current_value', 
      label: 'Current Value',
      align: 'right',
      render: (val, row) => (
        <span className="font-medium">
          ${(val || row.investment_amount)?.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'gain_loss', 
      label: 'Gain/Loss',
      align: 'right',
      render: (_, row) => {
        const invested = row.investment_amount || 0;
        const current = row.current_value || invested;
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
      key: 'ytd_return', 
      label: 'YTD',
      align: 'right',
      render: (val) => {
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
      key: 'redemption_frequency', 
      label: 'Redemption',
      render: (val) => val || '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => val && (
        <Badge className={`${getStatusColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    }
  ];

  const totalInvested = funds.reduce((sum, f) => sum + f.investment_amount, 0);
  const totalValue = funds.reduce((sum, f) => sum + (f.current_value || f.investment_amount), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Liquid Funds"
          subtitle={`${funds.length} funds • $${totalInvested.toLocaleString()} invested • $${totalValue.toLocaleString()} current value`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Fund"
        />

        <AssetTable
          columns={columns}
          data={funds}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No liquid funds in your portfolio yet"
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
                Are you sure you want to delete {deleteTarget?.fund_name}? This action cannot be undone.
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