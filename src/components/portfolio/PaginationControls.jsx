import { Button } from '@/components/ui/button';

export default function PaginationControls({
  page,
  limit,
  total,
  count,
  loading,
  onPageChange,
  onLimitChange,
}) {
  const showingStart = count === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = count === 0 ? 0 : showingStart + count - 1;
  const maxPage = limit ? Math.max(1, Math.ceil((total || 0) / limit)) : undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
      <div className="text-sm text-slate-500">
        Showing {showingStart} - {showingEnd} of {total ?? '...'}
      </div>
      <div className="flex items-center gap-2">
        <select
          className="border rounded-md px-3 py-2 text-sm text-slate-700"
          value={limit}
          onChange={(e) => {
            onLimitChange(Number(e.target.value));
            onPageChange(1);
          }}
        >
          {[10, 25, 50].map(size => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || (maxPage ? page >= maxPage : count < limit)}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
