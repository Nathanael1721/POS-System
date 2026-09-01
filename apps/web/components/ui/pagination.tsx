'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface PaginationProps {
  page: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Standard pager: "Menampilkan x–y dari z" + prev/next. */
export function Pagination({ page, total, totalPages, onChange }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * Math.ceil(total / Math.max(totalPages, 1)) + 1;
  const size = Math.ceil(total / Math.max(totalPages, 1));
  const to = Math.min(page * size, total);

  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-gray-500">
      <span className="tabular-nums">
        Menampilkan {from}–{to} dari {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
        </Button>
        <span className="px-2 font-medium tabular-nums text-gray-700">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
        >
          <Icon name="chevron-right" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
