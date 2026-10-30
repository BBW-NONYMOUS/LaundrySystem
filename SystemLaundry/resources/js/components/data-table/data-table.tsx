import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import type {
    ColumnDef,
    Row,
    SortingState,
    Table as TanStackTable,
    VisibilityState,
} from '@tanstack/react-table';
import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useTableQuery } from '@/components/data-table/use-table-query';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useNavigationLoading } from '@/hooks/use-navigation-loading';
import { cn } from '@/lib/utils';
import type { Paginated, TableFilters } from '@/types/models';

type ColumnMeta = { className?: string; headerClassName?: string };

function readVisibility(
    tableId: string,
    fallback: VisibilityState,
): VisibilityState {
    try {
        const saved = window.localStorage.getItem(`table:${tableId}:columns`);

        return saved
            ? { ...fallback, ...(JSON.parse(saved) as VisibilityState) }
            : fallback;
    } catch {
        return fallback;
    }
}

/**
 * The shadcn Data Table pattern on top of TanStack Table.
 *
 * Server mode (pass `meta` + `filters`): sorting and paging update the URL and Laravel
 * returns the page. Client mode (just `data`): sorting happens in the browser, for short lists.
 */
export function DataTable<TData>({
    tableId,
    columns,
    data,
    meta,
    filters,
    toolbar,
    emptyState,
    onRowClick,
    contextMenu,
    rowClassName,
    initialVisibility = {},
    className,
}: {
    /** Unique name, used to remember hidden columns per browser. */
    tableId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: ColumnDef<TData, any>[];
    data: TData[];
    meta?: Paginated<TData>['meta'];
    filters?: TableFilters;
    toolbar?: (table: TanStackTable<TData>) => ReactNode;
    emptyState?: ReactNode;
    onRowClick?: (row: TData) => void;
    /** ContextMenu items for right-click on a row. */
    contextMenu?: (row: TData) => ReactNode;
    rowClassName?: (row: TData) => string | undefined;
    initialVisibility?: VisibilityState;
    className?: string;
}) {
    // TanStack Table v8 mutates its table instance; the React Compiler would memoize it and
    // render stale rows. This directive opts just this component out of compilation.
    'use no memo';

    const serverMode = meta !== undefined;
    const { setParams } = useTableQuery();
    const loading = useNavigationLoading();
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
        () => readVisibility(tableId, initialVisibility),
    );
    const [clientSorting, setClientSorting] = useState<SortingState>([]);

    const serverSorting: SortingState = filters?.sort
        ? [{ id: String(filters.sort), desc: filters.direction !== 'asc' }]
        : [];

    useEffect(() => {
        try {
            window.localStorage.setItem(
                `table:${tableId}:columns`,
                JSON.stringify(columnVisibility),
            );
        } catch {
            // Private mode / blocked storage: hidden columns just won't be remembered.
        }
    }, [tableId, columnVisibility]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting: serverMode ? serverSorting : clientSorting,
            columnVisibility,
        },
        manualSorting: serverMode,
        manualPagination: true,
        enableSortingRemoval: false,
        onColumnVisibilityChange: setColumnVisibility,
        onSortingChange: (updater) => {
            const current = serverMode ? serverSorting : clientSorting;
            const next =
                typeof updater === 'function' ? updater(current) : updater;

            if (!serverMode) {
                setClientSorting(next);

                return;
            }

            const first = next[0];
            setParams({
                sort: first?.id ?? null,
                direction: first ? (first.desc ? 'desc' : 'asc') : null,
            });
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: serverMode ? undefined : getSortedRowModel(),
    });

    const handleRowClick = (event: MouseEvent, row: Row<TData>) => {
        // Clicks on buttons, links, checkboxes and menus inside the row keep their own behavior.
        if (
            (event.target as HTMLElement).closest(
                'a,button,input,label,[role="menuitem"]',
            )
        ) {
            return;
        }

        onRowClick?.(row.original);
    };

    const rows = table.getRowModel().rows;
    const skeletonRows = Math.min(Math.max(rows.length, 5), 10);
    const visibleColumns = table.getVisibleLeafColumns().length;

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {toolbar?.(table)}

            <div className="overflow-hidden rounded-lg border bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={
                                            (
                                                header.column.columnDef.meta as
                                                    | ColumnMeta
                                                    | undefined
                                            )?.headerClassName
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
                                                  header.getContext(),
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: skeletonRows }).map(
                                (_, index) => (
                                    <TableRow
                                        key={`skeleton-${index}`}
                                        className="hover:bg-transparent"
                                    >
                                        {Array.from({
                                            length: visibleColumns,
                                        }).map((__, cell) => (
                                            <TableCell key={cell}>
                                                <Skeleton className="h-4 w-full max-w-32" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ),
                            )
                        ) : rows.length > 0 ? (
                            rows.map((row) => {
                                const tableRow = (
                                    <TableRow
                                        key={row.id}
                                        onClick={
                                            onRowClick
                                                ? (event) =>
                                                      handleRowClick(event, row)
                                                : undefined
                                        }
                                        className={cn(
                                            onRowClick && 'cursor-pointer',
                                            rowClassName?.(row.original),
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={
                                                    (
                                                        cell.column.columnDef
                                                            .meta as
                                                            | ColumnMeta
                                                            | undefined
                                                    )?.className
                                                }
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );

                                return contextMenu ? (
                                    <ContextMenu key={row.id}>
                                        <ContextMenuTrigger asChild>
                                            {tableRow}
                                        </ContextMenuTrigger>
                                        <ContextMenuContent className="w-52">
                                            {contextMenu(row.original)}
                                        </ContextMenuContent>
                                    </ContextMenu>
                                ) : (
                                    tableRow
                                );
                            })
                        ) : (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={visibleColumns}
                                    className="p-0"
                                >
                                    {emptyState ?? (
                                        <p className="py-10 text-center text-sm text-muted-foreground">
                                            No results.
                                        </p>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {serverMode && meta.total > 0 && (
                <DataTablePagination meta={meta} />
            )}
        </div>
    );
}
