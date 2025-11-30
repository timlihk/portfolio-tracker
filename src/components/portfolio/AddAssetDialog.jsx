import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';

export default function AddAssetDialog({
  open,
  onOpenChange,
  title,
  fields,
  data,
  onChange,
  onSubmit,
  isLoading
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-5 mt-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </Label>
              
              {field.type === 'select' ? (
                <Select
                  value={data[field.name] || ''}
                  onValueChange={(value) => onChange(field.name, value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  id={field.name}
                  value={data[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="min-h-[100px] resize-none"
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type || 'text'}
                  step={field.type === 'number' ? 'any' : undefined}
                  value={data[field.name] || ''}
                  onChange={(e) => onChange(field.name, field.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                  placeholder={field.placeholder}
                  className="h-11"
                  required={field.required}
                />
              )}
            </div>
          ))}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-6 bg-slate-900 hover:bg-slate-800"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {data.id ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}