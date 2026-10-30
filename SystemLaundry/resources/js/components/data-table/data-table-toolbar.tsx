import type { Table } from '@tanstack/react-table';
import { Search, Settings2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useDebounce } from '@/hooks/use-debounce';
import { useHotkey } from '@/hooks/use-hotkey';

/**
 * Search box ("/" to focus), filter slots, Reset and column View options.
 */
export function DataTableToolbar<TData>({
    table,
    searchPlaceholder = 'Search…',
    searchKey = 'search',
    filterKeys = [],
    children,
    actions,
}: {
    table: Table<TData>;
    searchPlaceholder?: string;
    searchKey?: string | null;
    /** URL params that count as active filters (enables Reset). */
    filterKeys?: string[];
    children?: ReactNode;
    actions?: ReactNode;
}) {
    'use no memo'; // reads the live TanStack table instance (see data-table.tsx)

    const { get, setParams, reset } = useTableQuery();
    const initial = searchKey ? (get(searchKey) ?? '') : '';
    const [search, setSearch] = useState(initial);
    const debounced = useDebounce(search, 300);
    const inputRef = useRef<HTMLInputElement>(null);

    useHotkey('/', () => inputRef.current?.focus(), {
        enabled: searchKey !== null,
    });

    useEffect(() => {
        if (searchKey && debounced !== (get(searchKey) ?? '')) {
            setParams({ [searchKey]: debounced });
        }
        // Only react to the user's typing, not to URL changes from other filters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    const active = [searchKey, ...filterKeys].some((key) => key && get(key));
    const hideable = table
        .getAllColumns()
        .filter((column) => column.getCanHide());

    return (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
                {searchKey && (
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-8 pr-8 pl-8"
                            aria-label="Search"
                        />
                        <Kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 sm:inline-flex">
                            /
                        </Kbd>
                    </div>
                )}
                {children}
                {active && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                            setSearch('');
                            reset(['per_page', 'sort', 'direction']);
                        }}
                    >
                        Reset
                        <X />
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-2">
                {actions}
                {hideable.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden h-8 lg:flex"
                            >
                                <Settings2 />
                                View
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {hideable.map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                    onSelect={(event) => event.preventDefault()}
                                >
                                    {(
                                        column.columnDef.meta as
                                            | { label?: string }
                                            | undefined
                                    )?.label ?? column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
