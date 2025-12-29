import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type React from "react";

export type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  align?: string;
  className?: string;
  render?: (val: any, row: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
};

export type SortDir = "asc" | "desc";

type AssetTableProps<T extends { id?: string | number }> = {
  columns: Array<TableColumn<T>>;
  data: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onSort?: (key: string, dir: SortDir) => void;
  sortKey?: string;
  sortDir?: SortDir;
  emptyMessage?: string;
};

export default function AssetTable<T extends { id?: string | number }>({
  columns,
  data,
  onEdit,
  onDelete,
  onSort,
  sortKey,
  sortDir,
  emptyMessage = "No data available",
}: AssetTableProps<T>) {
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
            {columns.map((col) => {
              const targetKey = (col.sortKey ?? col.key) as string;
              const isActiveSort = sortKey === targetKey;
              const nextDir: SortDir =
                isActiveSort && sortDir === "asc" ? "desc" : "asc";

              return (
                <TableHead
                  key={col.key as string}
                  className={cn(
                    "text-xs font-semibold text-slate-500 uppercase tracking-wider py-4",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {onSort && col.sortable && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-slate-700"
                        aria-label={`Sort by ${col.label}`}
                        onClick={() => onSort(targetKey, nextDir)}
                      >
                        {isActiveSort ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </button>
                    )}
                  </div>
                </TableHead>
              );
            })}
            {(onEdit || onDelete) && <TableHead className="w-24" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id ?? Math.random().toString(36)}
              className="hover:bg-slate-50/50 transition-colors"
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key as string}
                  className={cn(
                    "py-4",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.render ? col.render(row[col.key as keyof T], row) : (row[col.key as keyof T] as React.ReactNode)}
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
