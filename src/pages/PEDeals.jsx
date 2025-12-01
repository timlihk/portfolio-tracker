import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
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

const DEAL_TYPES = ['Direct Investment', 'Co-Investment', 'SPV', 'Secondary Purchase', 'Other'];
const SECTORS = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Real Estate', 'Other'];
const STATUSES = ['Active', 'Partially Exited', 'Fully Exited', 'Written Off'];

const dealFields = [
  { name: 'company_name', label: 'Company Name', required: true, placeholder: 'Acme Corp' },
  { name: 'deal_type', label: 'Deal Type', type: 'select', options: DEAL_TYPES },
  { name: 'sector', label: 'Sector', type: 'select', options: SECTORS },
  { name: 'investment_amount', label: 'Investment Amount', type: 'number', required: true, placeholder: '250000' },
  { name: 'current_value', label: 'Current Value', type: 'number', placeholder: '350000' },
  { name: 'ownership_percentage', label: 'Ownership %', type: 'number', placeholder: '2.5' },
  { name: 'investment_date', label: 'Investment Date', type: 'date' },
  { name: 'sponsor', label: 'Lead Sponsor / GP', placeholder: 'Andreessen Horowitz' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function PEDeals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['peDeals'],
    queryFn: () => entities.PEDeal.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.PEDeal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.PEDeal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.PEDeal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
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

  const handleEdit = (deal) => {
    setFormData(deal);
    setDialogOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Partially Exited': return 'bg-blue-100 text-blue-700';
      case 'Fully Exited': return 'bg-slate-100 text-slate-700';
      case 'Written Off': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns = [
    { 
      key: 'company_name', 
      label: 'Company',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.sponsor && (
            <p className="text-sm text-slate-500">via {row.sponsor}</p>
          )}
        </div>
      )
    },
    { 
      key: 'deal_type', 
      label: 'Type',
      render: (val) => val || '-'
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
      key: 'moic', 
      label: 'MOIC',
      align: 'right',
      render: (_, row) => {
        const invested = row.investment_amount || 0;
        const current = row.current_value || invested;
        const moic = invested > 0 ? current / invested : 0;
        return (
          <span className={moic >= 1 ? 'text-emerald-600' : 'text-rose-600'}>
            {moic.toFixed(2)}x
          </span>
        );
      }
    },
    { 
      key: 'ownership_percentage', 
      label: 'Ownership',
      align: 'right',
      render: (val) => val ? `${val}%` : '-'
    },
    { 
      key: 'investment_date', 
      label: 'Date',
      render: (val) => val ? format(new Date(val), 'MMM yyyy') : '-'
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

  const totalInvested = deals.reduce((sum, d) => sum + d.investment_amount, 0);
  const totalValue = deals.reduce((sum, d) => sum + (d.current_value || d.investment_amount), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Private Equity Deals"
          subtitle={`${deals.length} deals • $${totalInvested.toLocaleString()} invested • $${totalValue.toLocaleString()} current value`}
          onAdd={() => {
            setFormData({});
            setDialogOpen(true);
          }}
          addLabel="Add Deal"
        />

        <AssetTable
          columns={columns}
          data={deals}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          emptyMessage="No PE deals in your portfolio yet"
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit PE Deal' : 'Add PE Deal'}
          fields={dealFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete PE Deal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteTarget?.company_name}? This action cannot be undone.
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