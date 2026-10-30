import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, MoreHorizontal, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableFacetedFilter } from '@/components/data-table/data-table-faceted-filter';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { DateRangePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { date, dateTime, money, number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as showOrder } from '@/routes/orders';
import { index, voidMethod } from '@/routes/payments';
import type {
    Option,
    Paginated,
    Payment,
    PaymentMethod,
    TableFilters,
} from '@/types/models';

type Props = {
    payments: Paginated<Payment>;
    filters: TableFilters;
    totalCollected: number;
    methods: Option<PaymentMethod>[];
};

function periodLabel(filters: TableFilters): string {
    if (!filters.from) {
        return 'All dates';
    }

    return filters.to && filters.to !== filters.from
        ? `${date(String(filters.from))} – ${date(String(filters.to))}`
        : date(String(filters.from));
}

export default function PaymentsIndex({
    payments,
    filters,
    totalCollected,
    methods,
}: Props) {
    const { can } = usePermissions();
    const { setParams } = useTableQuery();
    const [voiding, setVoiding] = useState<Payment | null>(null);

    const columns: ColumnDef<Payment>[] = [
        {
            id: 'paid_at',
            accessorKey: 'paid_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Paid at" />
            ),
            enableHiding: false,
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {dateTime(row.original.paid_at)}
                </span>
            ),
        },
        {
            id: 'order',
            header: 'Order #',
            meta: { label: 'Order #' },
            enableSorting: false,
            cell: ({ row }) => (
                <Link
                    href={showOrder(row.original.order_id)}
                    className="font-mono text-xs font-medium hover:underline"
                >
                    {row.original.order_number}
                </Link>
            ),
        },
        {
            id: 'customer',
            header: 'Customer',
            meta: { label: 'Customer' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="truncate">
                    {row.original.customer_name ?? '—'}
                </span>
            ),
        },
        {
            id: 'method',
            header: 'Method',
            meta: { label: 'Method' },
            enableSorting: false,
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.method_label}</Badge>
            ),
        },
        {
            id: 'reference',
            header: 'Reference',
            meta: { label: 'Reference' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.reference_number ?? '—'}
                </span>
            ),
        },
        {
            id: 'amount',
            accessorKey: 'amount',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Amount"
                    className="justify-end"
                />
            ),
            meta: {
                label: 'Amount',
                className: 'text-right',
                headerClassName: 'text-right',
            },
            cell: ({ row }) => {
                const payment = row.original;

                return (
                    <div className="flex items-center justify-end gap-2">
                        {payment.is_voided && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className="border-destructive/30 text-destructive"
                                    >
                                        Voided
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {payment.void_reason ?? 'Voided'}
                                    {payment.voided_by &&
                                        ` · by ${payment.voided_by.name}`}
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <span
                            className={cn(
                                'tabular-nums',
                                payment.is_voided &&
                                    'text-muted-foreground line-through',
                            )}
                        >
                            {money(payment.amount)}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'received_by',
            header: 'Received by',
            meta: { label: 'Received by' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.received_by?.name ?? '—'}
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
                            aria-label="Payment actions"
                        >
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onSelect={() =>
                                router.visit(showOrder(row.original.order_id))
                            }
                        >
                            <Receipt /> View order
                        </DropdownMenuItem>
                        {can('payments.void') && !row.original.is_voided && (
                            <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setVoiding(row.original)}
                            >
                                <Ban /> Void payment
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <>
            <Head title="Payments" />
            <PageBody>
                <PageHeader
                    title="Payments"
                    description="Every payment received, including voided ones."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <StatCard
                        title="Collected"
                        value={money(totalCollected)}
                        icon={Wallet}
                        tone="success"
                        hint={`${periodLabel(filters)} · voided payments excluded`}
                    />
                    <StatCard
                        title="Transactions"
                        value={number(payments.meta.total)}
                        icon={Receipt}
                        hint="Matching the current filters"
                    />
                </div>

                <DataTable
                    tableId="payments"
                    columns={columns}
                    data={payments.data}
                    meta={payments.meta}
                    filters={filters}
                    rowClassName={(payment) =>
                        payment.is_voided ? 'opacity-70' : undefined
                    }
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Order #, customer or reference…"
                            filterKeys={['method', 'voided', 'from', 'to']}
                        >
                            <DataTableFacetedFilter
                                paramKey="method"
                                title="Method"
                                single
                                options={methods.map((method) => ({
                                    value: method.value,
                                    label: method.label,
                                }))}
                            />
                            <DataTableFacetedFilter
                                paramKey="voided"
                                title="Status"
                                single
                                options={[
                                    { value: '0', label: 'Valid' },
                                    { value: '1', label: 'Voided' },
                                ]}
                            />
                            <DateRangePicker
                                from={filters.from as string | null}
                                to={filters.to as string | null}
                                placeholder="Paid date"
                                onChange={(range) => setParams(range)}
                            />
                        </DataTableToolbar>
                    )}
                    emptyState={
                        <EmptyState
                            icon={Wallet}
                            title="No payments found"
                            description="Try a different search or clear the filters."
                        />
                    }
                />
            </PageBody>

            {voiding && (
                <ConfirmDialog
                    open
                    onOpenChange={(open) => !open && setVoiding(null)}
                    title={`Void ${money(voiding.amount)} payment?`}
                    description={
                        <>
                            The payment stays in the history but no longer
                            counts. The balance of order{' '}
                            <span className="font-mono">
                                {voiding.order_number}
                            </span>{' '}
                            goes back up by {money(voiding.amount)}.
                        </>
                    }
                    confirmLabel="Void payment"
                    destructive
                    reasonLabel="Reason"
                    reasonPlaceholder="e.g. Wrong amount entered"
                    onConfirm={(reason, done) =>
                        router.post(
                            voidMethod.url(voiding.id),
                            { reason },
                            {
                                preserveScroll: true,
                                onSuccess: done.onSuccess,
                                onError: (errors) =>
                                    done.onError(firstError(errors)),
                            },
                        )
                    }
                />
            )}
        </>
    );
}

PaymentsIndex.layout = {
    breadcrumbs: [{ title: 'Payments', href: index() }],
};
