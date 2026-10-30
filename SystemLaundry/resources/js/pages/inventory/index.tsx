import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Boxes,
    Coins,
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
    SlidersHorizontal,
    Warehouse,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { EmptyState } from '@/components/empty-state';
import { InventoryItemDialog } from '@/components/management/inventory-item-dialog';
import { StockLevel } from '@/components/management/stock-level';
import { StockMovementDialog } from '@/components/management/stock-movement-dialog';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ContextMenuItem,
    ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { money, number, quantity, relative } from '@/lib/format';
import { index, show } from '@/routes/inventory';
import type {
    InventoryItem,
    Paginated,
    StockMovementType,
    TableFilters,
} from '@/types/models';

type Props = {
    items: Paginated<InventoryItem>;
    filters: TableFilters;
    lowStockCount: number;
    units: string[];
    can: { manage: boolean };
};

export default function InventoryIndex({
    items,
    filters,
    lowStockCount,
    units,
    can,
}: Props) {
    const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null);
    const [moving, setMoving] = useState<{
        item: InventoryItem;
        type: StockMovementType;
    } | null>(null);

    const lowOnPage = items.data.filter(
        (item) => item.is_low_stock && item.is_active,
    );
    const stockValue = items.data.reduce(
        (sum, item) => sum + (item.stock_value ?? 0),
        0,
    );

    const columns: ColumnDef<InventoryItem>[] = [
        {
            id: 'sku',
            accessorKey: 'sku',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="SKU" />
            ),
            cell: ({ row }) => (
                <span className="font-mono text-xs font-medium">
                    {row.original.sku}
                </span>
            ),
            enableHiding: false,
        },
        {
            id: 'name',
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Item" />
            ),
            meta: { label: 'Item' },
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.original.name}</span>
                    {!row.original.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                    )}
                    {row.original.is_low_stock && row.original.is_active && (
                        <Badge
                            variant="outline"
                            className="border-warning/30 bg-warning/10 text-warning"
                        >
                            Low
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            id: 'quantity_on_hand',
            accessorKey: 'quantity_on_hand',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="On hand" />
            ),
            meta: { label: 'On hand' },
            cell: ({ row }) => <StockLevel item={row.original} />,
        },
        {
            id: 'reorder_level',
            header: () => <div className="text-right">Reorder at</div>,
            meta: { label: 'Reorder at', className: 'text-right' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {quantity(row.original.reorder_level, row.original.unit)}
                </span>
            ),
        },
        {
            id: 'unit_cost',
            header: () => <div className="text-right">Unit cost</div>,
            meta: { label: 'Unit cost', className: 'text-right' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.unit_cost === null
                        ? '—'
                        : money(row.original.unit_cost)}
                </span>
            ),
        },
        {
            id: 'updated_at',
            accessorKey: 'updated_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Updated" />
            ),
            meta: { label: 'Updated' },
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {relative(row.original.updated_at)}
                </span>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            enableSorting: false,
            meta: { className: 'w-10' },
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${row.original.name}`}
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                        <ItemActions
                            item={row.original}
                            canManage={can.manage}
                            onMove={(type) =>
                                setMoving({ item: row.original, type })
                            }
                            onEdit={() => setEditing(row.original)}
                            Item={DropdownMenuItem}
                            Separator={DropdownMenuSeparator}
                        />
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <>
            <Head title="Inventory" />
            <PageBody>
                <PageHeader
                    title="Inventory"
                    description="Detergents, softeners, bags and other shop supplies."
                >
                    {can.manage && (
                        <Button onClick={() => setEditing('new')}>
                            <Plus />
                            Add item
                        </Button>
                    )}
                </PageHeader>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        title="Supply items"
                        value={number(items.meta.total)}
                        icon={Boxes}
                    />
                    <StatCard
                        title="Low stock"
                        value={number(lowStockCount)}
                        icon={AlertTriangle}
                        tone={lowStockCount > 0 ? 'warning' : 'default'}
                        hint={
                            lowStockCount > 0
                                ? 'At or below the reorder level'
                                : 'Everything is stocked'
                        }
                    />
                    <StatCard
                        title="Stock value"
                        value={money(stockValue)}
                        icon={Coins}
                        hint="Items on this page, at unit cost"
                    />
                </div>

                {lowOnPage.length > 0 && (
                    <Alert className="border-warning/40 bg-warning/5 text-warning">
                        <AlertTriangle />
                        <AlertTitle>Time to reorder</AlertTitle>
                        <AlertDescription className="text-warning/90">
                            {lowOnPage
                                .map(
                                    (item) =>
                                        `${item.name} (${quantity(item.quantity_on_hand, item.unit)} left)`,
                                )
                                .join(', ')}
                        </AlertDescription>
                    </Alert>
                )}

                <DataTable
                    tableId="inventory"
                    columns={columns}
                    data={items.data}
                    meta={items.meta}
                    filters={filters}
                    onRowClick={(item) => router.visit(show(item.id))}
                    contextMenu={(item) => (
                        <ItemActions
                            item={item}
                            canManage={can.manage}
                            onMove={(type) => setMoving({ item, type })}
                            onEdit={() => setEditing(item)}
                            Item={ContextMenuItem}
                            Separator={ContextMenuSeparator}
                        />
                    )}
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Name or SKU…"
                            filterKeys={['low']}
                        >
                            <DataTableFacetedFilter
                                paramKey="low"
                                title="Stock"
                                single
                                options={[
                                    {
                                        value: '1',
                                        label: 'Low stock only',
                                        icon: AlertTriangle,
                                        count: lowStockCount,
                                    },
                                ]}
                            />
                        </DataTableToolbar>
                    )}
                    emptyState={
                        <EmptyState
                            icon={Warehouse}
                            title="No supplies found"
                            description="Try a different search, or add the supplies the shop uses."
                        />
                    }
                />
            </PageBody>

            <StockMovementDialog
                item={moving?.item ?? null}
                defaultType={moving?.type}
                canManage={can.manage}
                onOpenChange={(open) => !open && setMoving(null)}
            />
            <InventoryItemDialog
                item={editing}
                units={units}
                onClose={() => setEditing(null)}
            />
        </>
    );
}

/**
 * Same actions in the ⋯ menu and the right-click menu.
 */
function ItemActions({
    item,
    canManage,
    onMove,
    onEdit,
    Item,
    Separator,
}: {
    item: InventoryItem;
    canManage: boolean;
    onMove: (type: StockMovementType) => void;
    onEdit: () => void;
    Item: typeof DropdownMenuItem | typeof ContextMenuItem;
    Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
}) {
    return (
        <>
            <Item onSelect={() => router.visit(show(item.id))}>
                <Eye /> View ledger
            </Item>
            <Separator />
            {canManage && (
                <Item onSelect={() => onMove('in')}>
                    <ArrowDownToLine /> Stock in
                </Item>
            )}
            <Item onSelect={() => onMove('out')}>
                <ArrowUpFromLine /> Stock out
            </Item>
            {canManage && (
                <>
                    <Item onSelect={() => onMove('adjustment')}>
                        <SlidersHorizontal /> Adjust
                    </Item>
                    <Separator />
                    <Item onSelect={onEdit}>
                        <Pencil /> Edit details
                    </Item>
                </>
            )}
        </>
    );
}

InventoryIndex.layout = {
    breadcrumbs: [{ title: 'Inventory', href: index() }],
};
