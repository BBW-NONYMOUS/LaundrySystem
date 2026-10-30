import { Head, router } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { FileDown, Users } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DateRangePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import type { StaffActivityRow } from '@/components/reports/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { date, dateTime, money, number, relative } from '@/lib/format';
import { exportMethod, index, staff } from '@/routes/reports';

type Props = {
    filters: { from: string; to: string };
    staff: StaffActivityRow[];
};

const numeric = {
    className: 'text-right tabular-nums',
    headerClassName: 'text-right',
};

/**
 * What each staff member did in the period (feature: reports on staff activities).
 */
export default function StaffReport({ filters, staff: rows }: Props) {
    const initials = useInitials();
    const period =
        filters.from === filters.to
            ? date(filters.from)
            : `${date(filters.from)} – ${date(filters.to)}`;

    const columns: ColumnDef<StaffActivityRow>[] = [
        {
            id: 'name',
            accessorKey: 'name',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Staff" />
            ),
            enableHiding: false,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                            {initials(row.original.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-medium">
                            {row.original.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.roles || 'No role'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'orders_created',
            accessorKey: 'orders_created',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Orders taken"
                    className="justify-end"
                />
            ),
            meta: { label: 'Orders taken', ...numeric },
            cell: ({ row }) => number(row.original.orders_created),
        },
        {
            id: 'status_updates',
            accessorKey: 'status_updates',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Status updates"
                    className="justify-end"
                />
            ),
            meta: { label: 'Status updates', ...numeric },
            cell: ({ row }) => number(row.original.status_updates),
        },
        {
            id: 'payments_count',
            accessorKey: 'payments_count',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Payments"
                    className="justify-end"
                />
            ),
            meta: { label: 'Payments', ...numeric },
            cell: ({ row }) => number(row.original.payments_count),
        },
        {
            id: 'payments_amount',
            accessorKey: 'payments_amount',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Collected"
                    className="justify-end"
                />
            ),
            meta: { label: 'Collected', ...numeric },
            cell: ({ row }) => money(row.original.payments_amount),
        },
        {
            id: 'trips_completed',
            accessorKey: 'trips_completed',
            header: ({ column }) => (
                <DataTableColumnHeader
                    column={column}
                    title="Trips"
                    className="justify-end"
                />
            ),
            meta: { label: 'Trips', ...numeric },
            cell: ({ row }) => number(row.original.trips_completed),
        },
        {
            id: 'last_login_at',
            accessorKey: 'last_login_at',
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Last login" />
            ),
            meta: { label: 'Last login' },
            cell: ({ row }) =>
                row.original.last_login_at ? (
                    <Tooltip>
                        <TooltipTrigger className="text-sm text-muted-foreground">
                            {relative(row.original.last_login_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(row.original.last_login_at)}
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-sm text-muted-foreground">Never</span>
                ),
        },
    ];

    return (
        <>
            <Head title="Staff activity" />
            <PageBody>
                <PageHeader title="Staff activity" description={period}>
                    <DateRangePicker
                        from={filters.from}
                        to={filters.to}
                        onChange={(range) =>
                            range.from &&
                            router.get(
                                staff.url(),
                                {
                                    from: range.from,
                                    to: range.to ?? range.from,
                                },
                                { preserveScroll: true },
                            )
                        }
                    />
                    <Button variant="outline" size="sm" className="h-8" asChild>
                        <a
                            href={exportMethod.url('staff', {
                                query: {
                                    format: 'pdf',
                                    from: filters.from,
                                    to: filters.to,
                                },
                            })}
                        >
                            <FileDown />
                            PDF
                        </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" asChild>
                        <a
                            href={exportMethod.url('staff', {
                                query: {
                                    format: 'xlsx',
                                    from: filters.from,
                                    to: filters.to,
                                },
                            })}
                        >
                            <FileDown />
                            Excel
                        </a>
                    </Button>
                </PageHeader>

                <DataTable
                    tableId="staff-activity"
                    columns={columns}
                    data={rows}
                    emptyState={
                        <EmptyState
                            icon={Users}
                            title="No staff accounts"
                            description="Add staff on the Users page."
                        />
                    }
                />
            </PageBody>
        </>
    );
}

StaffReport.layout = {
    breadcrumbs: [
        { title: 'Reports', href: index() },
        { title: 'Staff activity', href: staff() },
    ],
};
