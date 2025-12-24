import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AssetTable({
  columns,
  data,
  onEdit = undefined,
  onDelete = undefined,
  onSort = undefined,
  sortKey,
  sortDir,
  emptyMessage = "No data available"
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <Table>
        <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
            {columns.map((col) => (
              <TableHead 
                key={col.key} 
                className={cn(
                  "text-xs font-semibold text-slate-500 uppercase tracking-wider py-4",
                  col.align === 'right' && "text-right"
                )}
              >
                <div className="flex items-center gap-1">
                  <span>{col.label}</span>
                  {onSort && col.sortable && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700"
                      aria-label={`Sort by ${col.label}`}
                      onClick={() => {
                        const targetKey = col.sortKey ?? col.key;
                        const nextDir = sortKey === targetKey && sortDir === 'asc' ? 'desc' : 'asc';
                        onSort(targetKey, nextDir);
                      }}
                    >
                      {sortKey === (col.sortKey ?? col.key) ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </button>
                  )}
                </div>
              </TableHead>
            ))}
            {(onEdit || onDelete) && <TableHead className="w-24" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="hover:bg-slate-50/50 transition-colors"
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    "py-4",
                    col.align === 'right' && "text-right",
                    col.className
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
