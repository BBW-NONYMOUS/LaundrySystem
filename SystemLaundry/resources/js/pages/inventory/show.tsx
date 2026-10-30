import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    Pencil,
    SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { EmptyState } from '@/components/empty-state';
import { InventoryItemDialog } from '@/components/management/inventory-item-dialog';
import { StockLevel } from '@/components/management/stock-level';
import { StockMovementDialog } from '@/components/management/stock-movement-dialog';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dateTime, money, quantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/inventory';
import type {
    InventoryItem,
    Option,
    Paginated,
    StockMovement,
    StockMovementType,
} from '@/types/models';

type Props = {
    item: InventoryItem;
    movements: Paginated<StockMovement>;
    movementTypes: Option<StockMovementType>[];
    units: string[];
    can: { manage: boolean; stockOut: boolean };
};

const typeBadge: Record<StockMovementType, string> = {
    in: 'border-success/30 bg-success/10 text-success',
    out: 'border-info/30 bg-info/10 text-info',
    adjustment: 'border-warning/30 bg-warning/10 text-warning',
};

export default function InventoryShow({ item, movements, units, can }: Props) {
    const [editing, setEditing] = useState<InventoryItem | null>(null);
    const [moving, setMoving] = useState<StockMovementType | null>(null);

    const columns: ColumnDef<StockMovement>[] = [
        {
            id: 'created_at',
            header: 'Date',
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {dateTime(row.original.created_at)}
                </span>
            ),
        },
        {
            id: 'type',
            header: 'Type',
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className={typeBadge[row.original.type]}
                >
                    {row.original.type_label}
                </Badge>
            ),
        },
        {
            id: 'quantity_change',
            header: () => <div className="text-right">Change</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => {
                const change = row.original.quantity_change;

                return (
                    <span
                        className={cn(
                            'font-medium tabular-nums',
                            change >= 0 ? 'text-success' : 'text-destructive',
                        )}
                    >
                        {change >= 0 ? '+' : '−'}
                        {quantity(Math.abs(change), item.unit)}
                    </span>
                );
            },
        },
        {
            id: 'balance_after',
            header: () => <div className="text-right">Balance</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {quantity(row.original.balance_after, item.unit)}
                </span>
            ),
        },
        {
            id: 'user',
            header: 'By',
            cell: ({ row }) =>
                row.original.user?.name ?? (
                    <span className="text-muted-foreground">System</span>
                ),
        },
        {
            id: 'order_number',
            header: 'Order #',
            cell: ({ row }) =>
                row.original.order_number ? (
                    <span className="font-mono text-xs">
                        {row.original.order_number}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            id: 'remarks',
            header: 'Remarks',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.remarks ?? '—'}
                </span>
            ),
        },
    ];

    return (
        <>
            <Head title={item.name} />
            <PageBody>
                <PageHeader
                    title={
                        <span className="flex items-center gap-2">
                            {item.name}
                            <span className="font-mono text-sm font-normal text-muted-foreground">
                                {item.sku}
                            </span>
                        </span>
                    }
                    description="Every stock change is recorded below; the on-hand amount always equals this ledger."
                >
                    {can.manage && (
                        <Button
                            variant="outline"
                            onClick={() => setEditing(item)}
                        >
                            <Pencil />
                            Edit
                        </Button>
                    )}
                    {can.manage && (
                        <Button
                            variant="outline"
                            onClick={() => setMoving('adjustment')}
                        >
                            <SlidersHorizontal />
                            Adjust
                        </Button>
                    )}
                    {can.stockOut && (
                        <Button
                            variant="outline"
                            onClick={() => setMoving('out')}
                        >
                            <ArrowUpFromLine />
                            Stock out
                        </Button>
                    )}
                    {can.manage && (
                        <Button onClick={() => setMoving('in')}>
                            <ArrowDownToLine />
                            Stock in
                        </Button>
                    )}
                </PageHeader>

                <Card className="py-4">
                    <CardContent className="grid gap-4 sm:grid-cols-4">
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground">
                                On hand
                            </span>
                            <StockLevel item={item} />
                        </div>
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground">
                                Reorder at
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                                {quantity(item.reorder_level, item.unit)}
                            </span>
                        </div>
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground">
                                Unit cost
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                                {item.unit_cost === null
                                    ? '—'
                                    : money(item.unit_cost)}
                            </span>
                        </div>
                        <div className="grid gap-1">
                            <span className="text-xs text-muted-foreground">
                                Stock value
                            </span>
                            <span className="text-sm font-medium tabular-nums">
                                {item.stock_value === null
                                    ? '—'
                                    : money(item.stock_value)}
                            </span>
                        </div>
                        {item.is_low_stock && (
                            <p className="flex items-center gap-2 text-sm font-medium text-warning sm:col-span-4">
                                <AlertTriangle className="size-4" />
                                Low stock — reorder soon.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="grid gap-2">
                    <h2 className="text-base font-semibold">Stock ledger</h2>
                    <DataTable
                        tableId="stock-movements"
                        columns={columns}
                        data={movements.data}
                        meta={movements.meta}
                        emptyState={
                            <EmptyState
                                icon={History}
                                title="No movements yet"
                            />
                        }
                    />
                </div>
            </PageBody>

            <StockMovementDialog
                item={moving ? item : null}
                defaultType={moving ?? 'out'}
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

InventoryShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Inventory', href: index() },
        { title: props.item.name, href: show(props.item.id) },
    ],
});
