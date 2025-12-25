import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import PaginationControls from '@/components/portfolio/PaginationControls';
import { format } from 'date-fns';
import type { PeDeal } from '@/types';
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

const DEAL_TYPES = ['Direct Investment', 'Co-Investment', 'SPV', 'Secondary Purchase', 'Other'];
const SECTORS = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Real Estate', 'Other'];
const STATUSES = ['Active', 'Partially Exited', 'Fully Exited', 'Written Off'];

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

const dealFields = [
  { name: 'companyName', label: 'Company Name', required: true, placeholder: 'Acme Corp' },
  { name: 'dealType', label: 'Deal Type', type: 'select', options: DEAL_TYPES },
  { name: 'sector', label: 'Sector', type: 'select', options: SECTORS },
  { name: 'investmentAmount', label: 'Investment Amount', type: 'number', required: true, placeholder: '250000' },
  { name: 'currentValue', label: 'Current Value', type: 'number', placeholder: '350000' },
  { name: 'ownershipPercentage', label: 'Ownership %', type: 'number', placeholder: '2.5' },
  { name: 'investmentDate', label: 'Investment Date', type: 'date' },
  { name: 'sponsor', label: 'Lead Sponsor / GP', placeholder: 'Andreessen Horowitz' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function PEDeals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PeDeal>>({});
  const [deleteTarget, setDeleteTarget] = useState<PeDeal | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  const queryClient = useQueryClient();

  const { data: dealsResponse = [], isFetching: isLoading } = useQuery<PaginatedResponse<PeDeal> | PeDeal[]>({
    queryKey: ['peDeals', page, limit],
    queryFn: () => entities.PEDeal.listWithPagination({ page, limit }),
    keepPreviousData: true
  });
  const deals = Array.isArray(dealsResponse)
    ? dealsResponse
    : dealsResponse?.data || [];
  const pagination = !Array.isArray(dealsResponse)
    ? dealsResponse?.pagination || { total: deals.length, page, limit }
    : { total: deals.length, page, limit };

  const createMutation = useMutation({
    mutationFn: (data: Partial<PeDeal>) => entities.PEDeal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<PeDeal> }) => entities.PEDeal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.PEDeal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peDeals'] });
      setDeleteTarget(null);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.id) {
      const { id, ...data } = formData;
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (deal: PeDeal) => {
    setFormData(deal);
    setDialogOpen(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Partially Exited': return 'bg-blue-100 text-blue-700';
      case 'Fully Exited': return 'bg-slate-100 text-slate-700';
      case 'Written Off': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns: TableColumn<PeDeal>[] = [
    { 
      key: 'companyName', 
      label: 'Company',
      render: (val: PeDeal['companyName'], row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.sponsor && (
            <p className="text-sm text-slate-500">via {row.sponsor}</p>
          )}
        </div>
      )
    },
    { 
      key: 'dealType', 
      label: 'Type',
      render: (val: PeDeal['dealType']) => val || '-'
    },
    { 
      key: 'sector', 
      label: 'Sector',
      render: (val: PeDeal['sector']) => val && (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
          {val}
        </Badge>
      )
    },
    {
      key: 'investmentAmount',
      label: 'Invested',
      align: 'right',
      render: (val: PeDeal['investmentAmount']) => `$${(Number(val) || 0).toLocaleString()}`
    },
    {
      key: 'currentValue',
      label: 'Current Value',
      align: 'right',
      render: (val: PeDeal['currentValue'], row) => (
        <span className="font-medium">
          ${(Number(val) || Number(row.investmentAmount) || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'moic',
      label: 'MOIC',
      align: 'right',
      render: (_: unknown, row) => {
        const invested = Number(row.investmentAmount) || 0;
        const current = Number(row.currentValue) || invested;
        const moic = invested > 0 ? current / invested : 0;
        return (
          <span className={moic >= 1 ? 'text-emerald-600' : 'text-rose-600'}>
            {moic.toFixed(2)}x
          </span>
        );
      }
    },
    { 
      key: 'ownershipPercentage', 
      label: 'Ownership',
      align: 'right',
      render: (val: PeDeal['ownershipPercentage']) => val ? `${val}%` : '-'
    },
    { 
      key: 'investmentDate', 
      label: 'Date',
      render: (val: PeDeal['investmentDate']) => val ? format(new Date(val), 'MMM yyyy') : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: PeDeal['status']) => val && (
        <Badge className={`${getStatusColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    }
  ];

  const totalInvested = deals.reduce((sum, d) => sum + (Number(d.investmentAmount) || 0), 0);
  const totalValue = deals.reduce((sum, d) => sum + (Number(d.currentValue) || Number(d.investmentAmount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Private Equity Deals"
          subtitle={`${(pagination?.total ?? deals.length)} deals • $${totalInvested.toLocaleString()} invested • $${totalValue.toLocaleString()} current value`}
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

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={deals.length}
          loading={isLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
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
              Are you sure you want to delete {deleteTarget?.companyName}? This action cannot be undone.
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
