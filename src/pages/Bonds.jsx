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

const BOND_TYPES = ['Treasury', 'Corporate', 'Municipal', 'Agency', 'International', 'High Yield', 'Other'];
const RATINGS = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D', 'NR'];

const getBondFields = (accounts) => [
  { name: 'name', label: 'Bond Name / Issuer', required: true, placeholder: 'US Treasury 10Y' },
  { name: 'bond_type', label: 'Bond Type', type: 'select', options: BOND_TYPES },
  { name: 'account', label: 'Account', type: 'select', options: accounts.map(a => a.name), allowCustom: true },
  { name: 'face_value', label: 'Face Value', type: 'number', required: true, placeholder: '10000' },
  { name: 'purchase_price', label: 'Purchase Price', type: 'number', required: true, placeholder: '9800' },
  { name: 'current_value', label: 'Current Value', type: 'number', placeholder: '10100' },
  { name: 'coupon_rate', label: 'Coupon Rate (%)', type: 'number', placeholder: '4.5' },
  { name: 'maturity_date', label: 'Maturity Date', type: 'date' },
  { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
  { name: 'rating', label: 'Credit Rating', type: 'select', options: RATINGS },
  { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes...' }
];

export default function Bonds() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: bonds = [], isLoading } = useQuery({
    queryKey: ['bonds'],
    queryFn: () => base44.entities.Bond.list()
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => base44.entities.Account.list()
  });

  const bondFields = getBondFields(accounts);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Bond.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bond.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonds'] });
      setDialogOpen(false);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Bond.delete(id),
    onSuccess: () => {
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
          {row.bond_type && (
            <p className="text-sm text-slate-500">{row.bond_type}</p>
          )}
        </div>
      )
    },
    { 
      key: 'face_value', 
      label: 'Face Value',
      align: 'right',
      render: (val) => `$${val?.toLocaleString()}`
    },
    { 
      key: 'current_value', 
      label: 'Current Value',
      align: 'right',
      render: (val, row) => (
        <span className="font-medium">
          ${(val || row.purchase_price)?.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'coupon_rate', 
      label: 'Coupon',
      align: 'right',
      render: (val) => val ? `${val}%` : '-'
    },
    { 
      key: 'maturity_date', 
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
      key: 'account', 
      label: 'Account',
      render: (val) => val ? (
        <Badge variant="outline" className="font-normal">
          {val}
        </Badge>
      ) : '-'
    }
  ];

  const totalValue = bonds.reduce((sum, b) => sum + (b.current_value || b.purchase_price), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Bonds"
          subtitle={`${bonds.length} bonds • $${totalValue.toLocaleString()} total value`}
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