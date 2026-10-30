import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { BellRing, PackageCheck, PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { date, dateTime, money, number, relative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { unclaimed } from '@/routes/monitoring';
import { remind, show as showOrder } from '@/routes/orders';
import type { Order, Paginated } from '@/types/models';

type Props = {
    orders: Paginated<Order>;
    unclaimedAfterDays: number;
    reminderIntervalDays: number;
};

/**
 * Laundry on the shelf for too long. Reminders go out automatically; staff can also send one now.
 */
export default function UnclaimedOrders({
    orders,
    unclaimedAfterDays,
    reminderIntervalDays,
}: Props) {
    const { can } = usePermissions();
    const [sending, setSending] = useState<number | null>(null);

    const sendReminder = (order: Order) => {
        setSending(order.id);
        router.post(
            remind.url(order.id),
            {},
            { preserveScroll: true, onFinish: () => setSending(null) },
        );
    };

    const columns: ColumnDef<Order>[] = [
        {
            id: 'order_number',
            header: 'Order #',
            cell: ({ row }) => (
                <Link
                    href={showOrder(row.original.id)}
                    className="font-mono text-xs font-medium hover:underline"
                >
                    {row.original.order_number}
                </Link>
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
                    <a
                        href={`tel:${row.original.customer?.phone}`}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                        {row.original.customer?.phone}
                    </a>
                </div>
            ),
        },
        {
            id: 'ready_at',
            header: 'Ready since',
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {date(row.original.ready_at)}
                </span>
            ),
        },
        {
            id: 'waiting',
            header: () => <div className="text-right">Days waiting</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => {
                const days = row.original.ready_at
                    ? differenceInCalendarDays(
                          new Date(),
                          parseISO(row.original.ready_at),
                      )
                    : 0;

                return (
                    <span
                        className={cn(
                            'font-semibold tabular-nums',
                            days >= unclaimedAfterDays * 2
                                ? 'text-destructive'
                                : 'text-warning',
                        )}
                    >
                        {days}
                    </span>
                );
            },
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
        {
            id: 'reminders',
            header: 'Reminders sent',
            cell: ({ row }) =>
                row.original.reminder_count > 0 ? (
                    <Tooltip>
                        <TooltipTrigger className="text-sm">
                            {row.original.reminder_count} · last{' '}
                            {relative(row.original.last_reminded_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(row.original.last_reminded_at)}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        None yet
                    </span>
                ),
        },
        {
            id: 'actions',
            meta: { className: 'text-right' },
            cell: ({ row }) =>
                can('monitoring.view') ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendReminder(row.original)}
                        disabled={sending === row.original.id}
                    >
                        {sending === row.original.id ? (
                            <Spinner />
                        ) : (
                            <BellRing />
                        )}
                        Send reminder
                    </Button>
                ) : null,
        },
    ];

    return (
        <>
            <Head title="Unclaimed laundry" />
            <PageBody>
                <PageHeader
                    title="Unclaimed laundry"
                    description={`${number(orders.meta.total)} ${orders.meta.total === 1 ? 'order has' : 'orders have'} been ready for ${unclaimedAfterDays}+ days`}
                />

                <Alert>
                    <PackageOpen />
                    <AlertTitle>Automatic reminders</AlertTitle>
                    <AlertDescription>
                        Reminders go out automatically (SMS/email at 9 AM) after{' '}
                        {unclaimedAfterDays} days, then every{' '}
                        {reminderIntervalDays}{' '}
                        {reminderIntervalDays === 1 ? 'day' : 'days'} until the
                        laundry is claimed. Change this in Shop settings.
                    </AlertDescription>
                </Alert>

                <DataTable
                    tableId="monitoring-unclaimed"
                    columns={columns}
                    data={orders.data}
                    meta={orders.meta}
                    onRowClick={(order) => router.visit(showOrder(order.id))}
                    emptyState={
                        <EmptyState
                            icon={PackageCheck}
                            title="No unclaimed laundry"
                            description="Everything ready has been picked up or delivered."
                        />
                    }
                />
            </PageBody>
        </>
    );
}

UnclaimedOrders.layout = {
    breadcrumbs: [{ title: 'Unclaimed laundry', href: unclaimed() }],
};
