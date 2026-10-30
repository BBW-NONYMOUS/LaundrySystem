import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    ClipboardList,
    Download,
    Eye,
    FileDown,
    MoreHorizontal,
    Plus,
    Printer,
    QrCode,
    Wallet,
    Zap,
} from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { DateRangePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import {
    OverdueBadge,
    PaymentBadge,
    StatusBadge,
} from '@/components/status-badge';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { dateTime, money, number, relative } from '@/lib/format';
import { orderStatusStyles } from '@/lib/status';
import { cn } from '@/lib/utils';
import { create, index, receipt, show, tag } from '@/routes/orders';
import { exportMethod } from '@/routes/reports';
import type {
    Option,
    Order,
    OrderStatus,
    Paginated,
    PaymentStatus,
    TableFilters,
} from '@/types/models';

type Props = {
    orders: Paginated<Order>;
    filters: TableFilters;
    statusCounts: Partial<Record<OrderStatus, number>>;
    options: {
        statuses: Option<OrderStatus>[];
        paymentStatuses: Option<PaymentStatus>[];
    };
};

/** Quick views shown as tabs; each one is just a preset of URL filters. */
const quickViews = [
    { key: 'all', label: 'All', params: {} },
    {
        key: 'process',
        label: 'In process',
        params: { status: 'received,washing,drying,folding' },
    },
    { key: 'ready', label: 'Ready', params: { status: 'ready' } },
    { key: 'unpaid', label: 'Unpaid', params: { payment_status: 'unpaid' } },
    { key: 'overdue', label: 'Overdue', params: { overdue: '1' } },
    { key: 'cancelled', label: 'Cancelled', params: { status: 'cancelled' } },
] as const;

function activeView(filters: TableFilters): string {
    const match = quickViews.find((view) => {
        const keys = ['status', 'payment_status', 'overdue'] as const;

        return keys.every(
            (key) =>
                String(filters[key] ?? '') ===
                String((view.params as Record<string, string>)[key] ?? ''),
        );
    });

    return match?.key ?? 'custom';
}

function openInNewTab(url: string) {
    window.open(url, '_blank', 'noopener');
}

export default function OrdersIndex({
    orders,
    filters,
    statusCounts,
    options,
}: Props) {
    const { can } = usePermissions();
    const { setParams } = useTableQuery();
    const view = activeView(filters);

    const countFor = (statuses: OrderStatus[]) =>
        statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);

    const columns: ColumnDef<Order>[] = [
        {
            id: 'order_number',
            accessorKey: 'order_number',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Order #" />
            ),
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Link
                        href={show(row.original.id)}
                        className="font-mono text-xs font-medium hover:underline"
                    >
                        {row.original.order_number}
                    </Link>
                    {row.original.is_express && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Zap
                                    className="size-3.5 text-warning"
                                    aria-label="Express"
                                />
                            </TooltipTrigger>
                            <TooltipContent>Express</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            ),
            enableHiding: false,
        },
        {
            id: 'customer',
            header: 'Customer',
            meta: { label: 'Customer' },
            enableSorting: false,
            cell: ({ row }) => (
                <div className="min-w-0">
                    <div className="truncate font-medium">
                        {row.original.customer?.name}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                        {row.original.customer?.phone}
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            accessorKey: 'status',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Status" />
            ),
            meta: { label: 'Status' },
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'payment_status',
            header: 'Payment',
            meta: { label: 'Payment' },
            enableSorting: false,
            cell: ({ row }) => (
                <PaymentBadge status={row.original.payment_status} />
            ),
        },
        {
            id: 'items_count',
            header: 'Items',
            meta: {
                label: 'Items',
                className: 'text-center',
                headerClassName: 'text-center',
            },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.items_count ?? 0}
                </span>
            ),
        },
        {
            id: 'total_amount',
            accessorKey: 'total_amount',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Total"
                    className="justify-end"
                />
            ),
            meta: {
                label: 'Total',
                className: 'text-right',
                headerClassName: 'text-right',
            },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {money(row.original.total_amount)}
                </span>
            ),
        },
        {
            id: 'balance',
            header: () => <div className="text-right">Balance</div>,
            meta: { label: 'Balance', className: 'text-right' },
            enableSorting: false,
            cell: ({ row }) => (
                <span
                    className={cn(
                        'tabular-nums',
                        row.original.balance > 0 &&
                            'font-medium text-destructive',
                    )}
                >
                    {row.original.balance > 0
                        ? money(row.original.balance)
                        : '—'}
                </span>
            ),
        },
        {
            id: 'due_at',
            accessorKey: 'due_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Due" />
            ),
            meta: { label: 'Due' },
            cell: ({ row }) => {
                const order = row.original;

                if (
                    !order.due_at ||
                    ['completed', 'delivered', 'cancelled'].includes(
                        order.status,
                    )
                ) {
                    return <span className="text-muted-foreground">—</span>;
                }

                return order.is_overdue ? (
                    <OverdueBadge />
                ) : (
                    <Tooltip>
                        <TooltipTrigger className="text-sm">
                            {relative(order.due_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(order.due_at)}
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            id: 'created_at',
            accessorKey: 'created_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Created" />
            ),
            meta: { label: 'Created' },
            cell: ({ row }) => (
                <span className="text-sm whitespace-nowrap text-muted-foreground">
                    {dateTime(row.original.created_at)}
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
                            aria-label={`Actions for ${row.original.order_number}`}
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="font-mono text-xs">
                            {row.original.order_number}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <OrderActions
                            order={row.original}
                            canPay={can('payments.create')}
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
            <Head title="Orders" />
            <PageBody>
                <PageHeader
                    title="Orders"
                    description={`${number(orders.meta.total)} orders match your filters`}
                >
                    {can('reports.export') && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                    Pending orders
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={exportMethod.url('pending', {
                                            query: { format: 'pdf' },
                                        })}
                                    >
                                        <FileDown /> PDF
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href={exportMethod.url('pending', {
                                            query: { format: 'xlsx' },
                                        })}
                                    >
                                        <FileDown /> Excel
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {can('orders.create') && (
                        <Button asChild>
                            <Link href={create()}>
                                <Plus />
                                New order
                            </Link>
                        </Button>
                    )}
                </PageHeader>

                <Tabs
                    value={view}
                    onValueChange={(key) => {
                        const preset = quickViews.find(
                            (item) => item.key === key,
                        );

                        if (preset) {
                            setParams({
                                status: null,
                                payment_status: null,
                                overdue: null,
                                ...preset.params,
                            });
                        }
                    }}
                >
                    <TabsList className="h-auto flex-wrap">
                        {quickViews.map((item) => {
                            const count =
                                item.key === 'process'
                                    ? countFor([
                                          'received',
                                          'washing',
                                          'drying',
                                          'folding',
                                      ])
                                    : item.key === 'ready'
                                      ? countFor(['ready'])
                                      : item.key === 'cancelled'
                                        ? countFor(['cancelled'])
                                        : null;

                            return (
                                <TabsTrigger
                                    key={item.key}
                                    value={item.key}
                                    className="gap-1.5"
                                >
                                    {item.label}
                                    {count !== null && count > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="h-5 min-w-5 rounded-full px-1.5 tabular-nums"
                                        >
                                            {count}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>

                <DataTable
                    tableId="orders"
                    columns={columns}
                    data={orders.data}
                    meta={orders.meta}
                    filters={filters}
                    initialVisibility={{ created_at: false }}
                    onRowClick={(order) => router.visit(show(order.id))}
                    rowClassName={(order) =>
                        order.is_overdue ? 'bg-destructive/5' : undefined
                    }
                    contextMenu={(order) => (
                        <OrderActions
                            order={order}
                            canPay={can('payments.create')}
                            Item={ContextMenuItem}
                            Separator={ContextMenuSeparator}
                        />
                    )}
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Order #, name or mobile…"
                            filterKeys={[
                                'status',
                                'payment_status',
                                'express',
                                'overdue',
                                'from',
                                'to',
                            ]}
                        >
                            <DataTableFacetedFilter
                                paramKey="status"
                                title="Status"
                                options={options.statuses.map((status) => ({
                                    value: status.value,
                                    label: status.label,
                                    icon: orderStatusStyles[status.value].icon,
                                    count: statusCounts[status.value] ?? 0,
                                }))}
                            />
                            <DataTableFacetedFilter
                                paramKey="payment_status"
                                title="Payment"
                                single
                                options={options.paymentStatuses.map(
                                    (status) => ({
                                        value: status.value,
                                        label: status.label,
                                    }),
                                )}
                            />
                            <DataTableFacetedFilter
                                paramKey="express"
                                title="Express"
                                single
                                options={[
                                    {
                                        value: '1',
                                        label: 'Express only',
                                        icon: Zap,
                                    },
                                ]}
                            />
                            <DateRangePicker
                                from={filters.from as string | null}
                                to={filters.to as string | null}
                                placeholder="Created date"
                                onChange={(range) => setParams(range)}
                            />
                        </DataTableToolbar>
                    )}
                    emptyState={
                        <EmptyState
                            icon={ClipboardList}
                            title="No orders found"
                            description="Try a different search or clear the filters."
                            action={
                                can('orders.create') ? (
                                    <Button asChild size="sm">
                                        <Link href={create()}>
                                            <Plus /> New order
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </PageBody>
        </>
    );
}

/**
 * Same actions in the ⋯ menu and the right-click menu.
 */
function OrderActions({
    order,
    canPay,
    Item,
    Separator,
}: {
    order: Order;
    canPay: boolean;
    Item: typeof DropdownMenuItem | typeof ContextMenuItem;
    Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator;
}) {
    return (
        <>
            <Item onSelect={() => router.visit(show(order.id))}>
                <Eye /> View order
            </Item>
            {canPay && order.balance > 0 && order.status !== 'cancelled' && (
                <Item
                    onSelect={() =>
                        router.visit(show(order.id, { query: { pay: 1 } }))
                    }
                >
                    <Wallet /> Record payment
                </Item>
            )}
            <Separator />
            <Item onSelect={() => openInNewTab(receipt.url(order.id))}>
                <Printer /> Print receipt
            </Item>
            <Item onSelect={() => openInNewTab(tag.url(order.id))}>
                <QrCode /> Print bag tag
            </Item>
        </>
    );
}

OrdersIndex.layout = {
    breadcrumbs: [{ title: 'Orders', href: index() }],
};
