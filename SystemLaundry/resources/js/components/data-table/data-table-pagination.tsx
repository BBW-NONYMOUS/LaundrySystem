import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { number } from '@/lib/format';
import type { Paginated } from '@/types/models';

const PAGE_SIZES = [10, 15, 25, 50, 100];

/**
 * "Showing 1–15 of 653" + rows per page + page buttons. Page state lives in the URL.
 */
export function DataTablePagination<TData>({
    meta,
}: {
    meta: Paginated<TData>['meta'];
}) {
    const { setParams } = useTableQuery();
    const page = meta.current_page;
    const go = (target: number) =>
        setParams({ page: target === 1 ? null : target });

    return (
        <div className="flex flex-col-reverse items-center justify-between gap-3 px-1 sm:flex-row">
            <p className="text-sm text-muted-foreground tabular-nums">
                Showing {number(meta.from ?? 0)}–{number(meta.to ?? 0)} of{' '}
                {number(meta.total)}
            </p>

            <div className="flex items-center gap-4 sm:gap-6">
                <div className="hidden items-center gap-2 sm:flex">
                    <span className="text-sm font-medium">Rows per page</span>
                    <Select
                        value={String(meta.per_page)}
                        onValueChange={(value) =>
                            setParams({ per_page: value })
                        }
                    >
                        <SelectTrigger
                            className="h-8 w-[72px]"
                            aria-label="Rows per page"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {PAGE_SIZES.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <span className="text-sm font-medium tabular-nums">
                    Page {page} of {meta.last_page}
                </span>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => go(1)}
                        disabled={page <= 1}
                        aria-label="First page"
                    >
                        <ChevronsLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => go(page - 1)}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => go(page + 1)}
                        disabled={page >= meta.last_page}
                        aria-label="Next page"
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="hidden size-8 lg:flex"
                        onClick={() => go(meta.last_page)}
                        disabled={page >= meta.last_page}
                        aria-label="Last page"
                    >
                        <ChevronsRight />
                    </Button>
                </div>
            </div>
        </div>
    );
}
