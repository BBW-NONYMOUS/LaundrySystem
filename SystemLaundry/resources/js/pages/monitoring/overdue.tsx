import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { AlarmClock, PartyPopper } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { ExpressBadge, StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { dateTime, money, number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { overdue } from '@/routes/monitoring';
import { show as showOrder } from '@/routes/orders';
import type { Order, Paginated } from '@/types/models';

/**
 * Laundry still in the shop (received → folding) after its promised time.
 */
export default function OverdueOrders({
    orders,
}: {
    orders: Paginated<Order>;
}) {
    const columns: ColumnDef<Order>[] = [
        {
            id: 'order_number',
            header: 'Order #',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5">
                    <Link
                        href={showOrder(row.original.id)}
                        className="font-mono text-xs font-medium hover:underline"
                    >
                        {row.original.order_number}
                    </Link>
                    {row.original.is_express && <ExpressBadge />}
                </div>
            ),
        },
        {
            id: 'customer',
            header: 'Customer',
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
            header: 'Stuck at',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'due_at',
            header: 'Was due',
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {dateTime(row.original.due_at)}
                </span>
            ),
        },
        {
            id: 'late',
            header: 'How late',
            cell: ({ row }) =>
                row.original.due_at ? (
                    <span className="flex items-center gap-1.5 font-medium whitespace-nowrap text-destructive">
                        <AlarmClock className="size-4" />
                        {formatDistanceToNowStrict(
                            parseISO(row.original.due_at),
                        )}{' '}
                        late
                    </span>
                ) : null,
        },
        {
            id: 'items',
            header: () => <div className="text-center">Items</div>,
            meta: { className: 'text-center' },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {row.original.items_count ?? 0}
                </span>
            ),
        },
        {
            id: 'balance',
            header: () => <div className="text-right">Balance</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => (
                <span
                    className={cn(
                        'tabular-nums',
                        row.original.balance > 0 && 'text-destructive',
                    )}
                >
                    {row.original.balance > 0
                        ? money(row.original.balance)
                        : 'Paid'}
                </span>
            ),
        },
    ];

    return (
        <>
            <Head title="Overdue orders" />
            <PageBody>
                <PageHeader
                    title="Overdue orders"
                    description={`${number(orders.meta.total)} ${orders.meta.total === 1 ? 'order is' : 'orders are'} past the promised time and still being processed`}
                />

                {orders.meta.total > 0 && (
                    <Alert>
                        <AlarmClock />
                        <AlertTitle>Oldest first</AlertTitle>
                        <AlertDescription>
                            Move these to the front of the queue, or call the
                            customer with a new time. Express orders are marked.
                            The owner and cashiers also get an alert at 8 AM and
                            1 PM.
                        </AlertDescription>
                    </Alert>
                )}

                <DataTable
                    tableId="monitoring-overdue"
                    columns={columns}
                    data={orders.data}
                    meta={orders.meta}
                    onRowClick={(order) => router.visit(showOrder(order.id))}
                    emptyState={
                        <EmptyState
                            icon={PartyPopper}
                            title="Nothing is overdue"
                            description="All laundry in the shop is on time."
                        />
                    }
                />
            </PageBody>
        </>
    );
}

OverdueOrders.layout = {
    breadcrumbs: [{ title: 'Overdue orders', href: overdue() }],
};
