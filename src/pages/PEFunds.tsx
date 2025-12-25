import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entities } from '@/api/backendClient';
import PageHeader from '@/components/portfolio/PageHeader';
import AssetTable from '@/components/portfolio/AssetTable';
import AddAssetDialog from '@/components/portfolio/AddAssetDialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import PaginationControls from '@/components/portfolio/PaginationControls';
import type { PeFund } from '@/types';
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

const FUND_TYPES = ['Buyout', 'Growth Equity', 'Venture Capital', 'Real Estate', 'Infrastructure', 'Credit', 'Secondaries', 'Fund of Funds', 'Other'];
const STATUSES = ['Active', 'Fully Invested', 'Harvesting', 'Liquidated'];

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

const fundFields = [
  { name: 'fundName', label: 'Fund Name', required: true, placeholder: 'Sequoia Capital XV' },
  { name: 'manager', label: 'Fund Manager / GP', placeholder: 'Sequoia Capital' },
  { name: 'fundType', label: 'Fund Type', type: 'select', options: FUND_TYPES },
  { name: 'vintageYear', label: 'Vintage Year', type: 'number', placeholder: '2023' },
  { name: 'commitment', label: 'Total Commitment', type: 'number', required: true, placeholder: '500000' },
  { name: 'calledCapital', label: 'Called Capital', type: 'number', placeholder: '250000' },
  { name: 'distributions', label: 'Distributions', type: 'number', placeholder: '100000' },
  { name: 'nav', label: 'Current NAV', type: 'number', placeholder: '300000' },
  { name: 'commitmentDate', label: 'Commitment Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function PEFunds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PeFund>>({});
  const [deleteTarget, setDeleteTarget] = useState<PeFund | null>(null);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  
  const queryClient = useQueryClient();

  const { data: fundsResponse = [], isFetching: isLoading } = useQuery<PaginatedResponse<PeFund> | PeFund[]>({
    queryKey: ['peFunds', page, limit],
    queryFn: () => entities.PEFund.listWithPagination({ page, limit }),
    keepPreviousData: true
  });
  const funds = Array.isArray(fundsResponse)
    ? fundsResponse
    : fundsResponse?.data || [];
  const pagination = !Array.isArray(fundsResponse)
    ? fundsResponse?.pagination || { total: funds.length, page, limit }
    : { total: funds.length, page, limit };

  const createMutation = useMutation({
    mutationFn: (data: Partial<PeFund>) => entities.PEFund.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<PeFund> }) => entities.PEFund.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peFunds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => entities.PEFund.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peFunds'] });
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

  const handleEdit = (fund: PeFund) => {
    setFormData(fund);
    setDialogOpen(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Fully Invested': return 'bg-blue-100 text-blue-700';
      case 'Harvesting': return 'bg-amber-100 text-amber-700';
      case 'Liquidated': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const columns: TableColumn<PeFund>[] = [
    { 
      key: 'fundName', 
      label: 'Fund',
      render: (val: PeFund['fundName'], row) => (
        <div>
          <span className="font-semibold text-slate-900">{val}</span>
          {row.manager && (
            <p className="text-sm text-slate-500">{row.manager}</p>
          )}
        </div>
      )
    },
    { 
      key: 'fundType', 
      label: 'Type',
      render: (val: PeFund['fundType']) => val || '-'
    },
    { 
      key: 'vintageYear', 
      label: 'Vintage',
      render: (val: PeFund['vintageYear']) => val || '-'
    },
    {
      key: 'commitment',
      label: 'Commitment',
      align: 'right',
      render: (val: PeFund['commitment']) => `$${(Number(val) || 0).toLocaleString()}`
    },
    {
      key: 'called',
      label: 'Called / Unfunded',
      render: (_: unknown, row) => {
        const called = Number(row.calledCapital) || 0;
        const commitment = Number(row.commitment) || 0;
        const unfunded = commitment - called;
        const pct = commitment > 0 ? (called / commitment) * 100 : 0;
        return (
          <div className="min-w-[140px]">
            <div className="flex justify-between text-sm mb-1">
              <span>${called.toLocaleString()}</span>
              <span className="text-slate-500">${unfunded.toLocaleString()}</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        );
      }
    },
    {
      key: 'nav',
      label: 'NAV',
      align: 'right',
      render: (val: PeFund['nav']) => <span className="font-medium">${(Number(val) || 0).toLocaleString()}</span>
    },
    {
      key: 'distributions',
      label: 'Distributions',
      align: 'right',
      render: (val: PeFund['distributions']) => (
        <span className="text-emerald-600">${(Number(val) || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'tvpi',
      label: 'TVPI',
      align: 'right',
      render: (_: unknown, row) => {
        const called = Number(row.calledCapital) || 0;
        if (called === 0) return '-';
        const tvpi = ((Number(row.nav) || 0) + (Number(row.distributions) || 0)) / called;
        return (
          <span className={tvpi >= 1 ? 'text-emerald-600' : 'text-rose-600'}>
            {tvpi.toFixed(2)}x
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (val: PeFund['status']) => val && (
        <Badge className={`${getStatusColor(val)} font-normal`}>
          {val}
        </Badge>
      )
    }
  ];

  const totalCommitment = funds.reduce((sum, f) => sum + (Number(f.commitment) || 0), 0);
  const totalNAV = funds.reduce((sum, f) => sum + (Number(f.nav) || 0), 0);
  const totalCount = pagination?.total ?? funds.length;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Private Equity Funds"
          subtitle={`${totalCount} funds • $${totalCommitment.toLocaleString()} committed • $${totalNAV.toLocaleString()} NAV`}
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
          emptyMessage="No PE funds in your portfolio yet"
        />

        <PaginationControls
          page={page}
          limit={limit}
          total={pagination?.total}
          count={funds.length}
          loading={isLoading}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <AddAssetDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={formData.id ? 'Edit PE Fund' : 'Add PE Fund'}
          fields={fundFields}
          data={formData}
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete PE Fund</AlertDialogTitle>
              <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.fundName}? This action cannot be undone.
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
