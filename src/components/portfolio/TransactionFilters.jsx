import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from 'lucide-react';

const ASSET_TYPES = ['All', 'Stock', 'Bond', 'PE Fund', 'PE Deal', 'Liquid Fund'];
const TRANSACTION_TYPES = ['All', 'Buy', 'Sell', 'Transfer In', 'Transfer Out', 'Dividend', 'Distribution', 'Capital Call', 'Redemption'];

export default function TransactionFilters({ filters, onFilterChange, accounts = [] }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      startDate: '',
      endDate: '',
      assetType: 'All',
      transactionType: 'All',
      account: 'All'
    });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || 
    filters.assetType !== 'All' || filters.transactionType !== 'All' || 
    filters.account !== 'All';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Start Date</Label>
          <div className="relative">
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="h-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">End Date</Label>
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="h-10"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Asset Type</Label>
          <Select value={filters.assetType} onValueChange={(v) => handleChange('assetType', v)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Transaction Type</Label>
          <Select value={filters.transactionType} onValueChange={(v) => handleChange('transactionType', v)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label className="text-xs text-slate-500">Account</Label>
          <Select value={filters.account} onValueChange={(v) => handleChange('account', v)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Accounts</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}