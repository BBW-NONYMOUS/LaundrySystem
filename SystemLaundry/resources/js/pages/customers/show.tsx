import { Head, Link, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    ClipboardList,
    Mail,
    MapPin,
    Phone,
    Plus,
    ShoppingBag,
    Trash2,
    Wallet,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { CustomerFormFields } from '@/components/customers/customer-form-fields';
import type { CustomerFormData } from '@/components/customers/customer-form-fields';
import { DataTable } from '@/components/data-table/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { date, dateTime, money, number } from '@/lib/format';
import { cn } from '@/lib/utils';
import { destroy, index, show, update } from '@/routes/customers';
import { create as newOrder, show as showOrder } from '@/routes/orders';
import type { Customer, Order, Paginated, Payment } from '@/types/models';

type Props = {
    customer: Customer;
    orders: Paginated<Order>;
    payments: Payment[];
    summary: {
        orders: number;
        spent: number;
        balance: number;
        open_orders: number;
    };
    can: { update: boolean; delete: boolean };
};

export default function CustomerShow({
    customer,
    orders,
    payments,
    summary,
    can: allowed,
}: Props) {
    const { can } = usePermissions();
    const getInitials = useInitials();

    const orderColumns: ColumnDef<Order>[] = [
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
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'payment',
            header: 'Payment',
            cell: ({ row }) => (
                <PaymentBadge status={row.original.payment_status} />
            ),
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
            id: 'total',
            header: () => <div className="text-right">Total</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {money(row.original.total_amount)}
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
            id: 'created_at',
            header: 'Created',
            cell: ({ row }) => (
                <span className="text-sm whitespace-nowrap text-muted-foreground">
                    {dateTime(row.original.created_at)}
                </span>
            ),
        },
    ];

    const paymentColumns: ColumnDef<Payment>[] = [
        {
            id: 'paid_at',
            accessorKey: 'paid_at',
            header: 'Paid at',
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {dateTime(row.original.paid_at)}
                </span>
            ),
        },
        {
            id: 'order',
            header: 'Order #',
            cell: ({ row }) => (
                <Link
                    href={showOrder(row.original.order_id)}
                    className="font-mono text-xs hover:underline"
                >
                    {row.original.order_number}
                </Link>
            ),
        },
        {
            id: 'method',
            header: 'Method',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                        {row.original.method_label}
                    </Badge>
                    {row.original.is_voided && (
                        <Badge
                            variant="outline"
                            className="border-destructive/30 text-destructive"
                        >
                            Voided
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            id: 'amount',
            accessorKey: 'amount',
            header: () => <div className="text-right">Amount</div>,
            meta: { className: 'text-right' },
            cell: ({ row }) => (
                <span
                    className={cn(
                        'tabular-nums',
                        row.original.is_voided &&
                            'text-muted-foreground line-through',
                    )}
                >
                    {money(row.original.amount)}
                </span>
            ),
        },
        {
            id: 'received_by',
            header: 'Received by',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.received_by?.name ?? '—'}
                </span>
            ),
        },
    ];

    return (
        <>
            <Head title={customer.name} />
            <PageBody>
                <PageHeader
                    title={
                        <span className="flex items-center gap-3">
                            <Avatar className="size-10">
                                <AvatarFallback>
                                    {getInitials(customer.name)}
                                </AvatarFallback>
                            </Avatar>
                            {customer.name}
                            {customer.has_portal_account && (
                                <Badge
                                    variant="outline"
                                    className="border-primary/30 text-primary"
                                >
                                    Portal
                                </Badge>
                            )}
                        </span>
                    }
                    description={`Customer since ${date(customer.created_at)}`}
                >
                    {can('customers.delete') && allowed.delete && (
                        <ConfirmDialog
                            title={`Remove ${customer.name}?`}
                            description="The customer disappears from searches. Their past orders and payments are kept for reports."
                            confirmLabel="Remove customer"
                            destructive
                            onConfirm={(_, done) =>
                                router.delete(destroy.url(customer.id), {
                                    onSuccess: done.onSuccess,
                                    onError: (errors) =>
                                        done.onError(firstError(errors)),
                                })
                            }
                            trigger={
                                <Button variant="outline">
                                    <Trash2 />
                                    Remove
                                </Button>
                            }
                        />
                    )}
                    {can('customers.delete') && !allowed.delete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {/* Wrapper span so the tooltip works on a disabled button. */}
                                <span tabIndex={0}>
                                    <Button variant="outline" disabled>
                                        <Trash2 />
                                        Remove
                                    </Button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                This customer still has unfinished orders.
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {can('orders.create') && (
                        <Button asChild>
                            <Link
                                href={newOrder({
                                    query: { customer: customer.id },
                                })}
                            >
                                <Plus />
                                New order for this customer
                            </Link>
                        </Button>
                    )}
                </PageHeader>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <a
                        href={`tel:${customer.phone}`}
                        className="flex items-center gap-1.5 font-mono hover:text-foreground"
                    >
                        <Phone className="size-4" />
                        {customer.phone}
                    </a>
                    {customer.email && (
                        <a
                            href={`mailto:${customer.email}`}
                            className="flex items-center gap-1.5 hover:text-foreground"
                        >
                            <Mail className="size-4" />
                            {customer.email}
                        </a>
                    )}
                    {customer.address && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="size-4" />
                            {customer.address}
                        </span>
                    )}
                </div>

                {customer.notes && (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                        <span className="font-medium">Note:</span>{' '}
                        {customer.notes}
                    </p>
                )}

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Orders"
                        value={number(summary.orders)}
                        icon={ClipboardList}
                    />
                    <StatCard
                        title="Total spent"
                        value={money(summary.spent)}
                        icon={ShoppingBag}
                    />
                    <StatCard
                        title="Balance owed"
                        value={money(summary.balance)}
                        icon={Wallet}
                        tone={summary.balance > 0 ? 'destructive' : 'default'}
                    />
                    <StatCard
                        title="Open orders"
                        value={number(summary.open_orders)}
                        icon={ClipboardList}
                    />
                </div>

                <Tabs defaultValue="orders">
                    <TabsList>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="mt-4">
                        <DataTable
                            tableId="customer-orders"
                            columns={orderColumns}
                            data={orders.data}
                            meta={orders.meta}
                            onRowClick={(order) =>
                                router.visit(showOrder(order.id))
                            }
                            emptyState={
                                <EmptyState
                                    icon={ClipboardList}
                                    title="No orders yet"
                                />
                            }
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="mt-4">
                        <DataTable
                            tableId="customer-payments"
                            columns={paymentColumns}
                            data={payments}
                            emptyState={
                                <EmptyState
                                    icon={Wallet}
                                    title="No payments yet"
                                />
                            }
                        />
                        {payments.length >= 20 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Showing the 20 most recent payments.
                            </p>
                        )}
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <CustomerDetailsForm
                            customer={customer}
                            canEdit={allowed.update}
                        />
                    </TabsContent>
                </Tabs>
            </PageBody>
        </>
    );
}

function CustomerDetailsForm({
    customer,
    canEdit,
}: {
    customer: Customer;
    canEdit: boolean;
}) {
    const form = useForm<CustomerFormData>({
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(update.url(customer.id), { preserveScroll: true });
    };

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Customer details</CardTitle>
                <CardDescription>
                    Used on receipts, SMS notifications and deliveries.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid gap-6">
                    <fieldset disabled={!canEdit} className="contents">
                        <CustomerFormFields
                            data={form.data}
                            setData={form.setData}
                            errors={form.errors}
                        />
                    </fieldset>
                    {canEdit && (
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={form.processing || !form.isDirty}
                            >
                                {form.processing && <Spinner />}
                                Save changes
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

CustomerShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Customers', href: index() },
        { title: props.customer.name, href: show(props.customer.id) },
    ],
});
