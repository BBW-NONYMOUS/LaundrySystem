import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { CustomerFormFields } from '@/components/customers/customer-form-fields';
import type { CustomerFormData } from '@/components/customers/customer-form-fields';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { usePermissions } from '@/hooks/use-permissions';
import { dateTime, money, number, relative } from '@/lib/format';
import { index, show, store } from '@/routes/customers';
import type { Customer, Paginated, TableFilters } from '@/types/models';

type Props = {
    customers: Paginated<Customer>;
    filters: TableFilters;
};

const emptyCustomer: CustomerFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
};

export default function CustomersIndex({ customers, filters }: Props) {
    const { can } = usePermissions();
    const getInitials = useInitials();
    const [adding, setAdding] = useState(false);

    const columns: ColumnDef<Customer>[] = [
        {
            id: 'name',
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Customer" />
            ),
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                            {getInitials(row.original.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium">
                            {row.original.name}
                        </div>
                        {row.original.email && (
                            <div className="truncate text-xs text-muted-foreground">
                                {row.original.email}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'phone',
            header: 'Mobile',
            meta: { label: 'Mobile' },
            enableSorting: false,
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.phone}</span>
            ),
        },
        {
            id: 'orders_count',
            accessorKey: 'orders_count',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Orders"
                    className="justify-end"
                />
            ),
            meta: {
                label: 'Orders',
                className: 'text-right',
                headerClassName: 'text-right',
            },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {number(row.original.orders_count ?? 0)}
                </span>
            ),
        },
        {
            id: 'total_spent',
            accessorKey: 'total_spent',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Total spent"
                    className="justify-end"
                />
            ),
            meta: {
                label: 'Total spent',
                className: 'text-right',
                headerClassName: 'text-right',
            },
            cell: ({ row }) => (
                <span className="tabular-nums">
                    {money(row.original.total_spent ?? 0)}
                </span>
            ),
        },
        {
            id: 'last_order_at',
            accessorKey: 'last_order_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Last order" />
            ),
            meta: { label: 'Last order' },
            cell: ({ row }) =>
                row.original.last_order_at ? (
                    <Tooltip>
                        <TooltipTrigger className="text-sm text-muted-foreground">
                            {relative(row.original.last_order_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(row.original.last_order_at)}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-muted-foreground">Never</span>
                ),
        },
        {
            id: 'portal',
            header: 'Portal',
            meta: { label: 'Portal' },
            enableSorting: false,
            cell: ({ row }) =>
                row.original.has_portal_account ? (
                    <Badge
                        variant="outline"
                        className="border-primary/30 text-primary"
                    >
                        Portal
                    </Badge>
                ) : null,
        },
    ];

    return (
        <>
            <Head title="Customers" />
            <PageBody>
                <PageHeader
                    title="Customers"
                    description={`${number(customers.meta.total)} customers`}
                >
                    {can('customers.create') && (
                        <Button onClick={() => setAdding(true)}>
                            <Plus />
                            Add customer
                        </Button>
                    )}
                </PageHeader>

                <DataTable
                    tableId="customers"
                    columns={columns}
                    data={customers.data}
                    meta={customers.meta}
                    filters={filters}
                    onRowClick={(customer) => router.visit(show(customer.id))}
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Name or mobile number…"
                        />
                    )}
                    emptyState={
                        <EmptyState
                            icon={UsersRound}
                            title="No customers found"
                            description="Try another name or mobile number, or add the customer."
                            action={
                                can('customers.create') ? (
                                    <Button
                                        size="sm"
                                        onClick={() => setAdding(true)}
                                    >
                                        <Plus /> Add customer
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </PageBody>

            <AddCustomerSheet open={adding} onOpenChange={setAdding} />
        </>
    );
}

/**
 * Right-side Sheet with the customer form. The server rejects a mobile number that
 * already exists (in any format), and the error appears under the field.
 */
function AddCustomerSheet({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm<CustomerFormData>(emptyCustomer);

    const close = (value: boolean) => {
        if (!value) {
            form.reset();
            form.clearErrors();
        }

        onOpenChange(value);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => close(false),
        });
    };

    return (
        <Sheet open={open} onOpenChange={close}>
            <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                <form onSubmit={submit} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Add customer</SheetTitle>
                        <SheetDescription>
                            Search first to avoid duplicates — each mobile
                            number can belong to only one customer.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 px-4">
                        <CustomerFormFields
                            data={form.data}
                            setData={form.setData}
                            errors={form.errors}
                        />
                    </div>
                    <SheetFooter>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Save customer
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [{ title: 'Customers', href: index() }],
};
