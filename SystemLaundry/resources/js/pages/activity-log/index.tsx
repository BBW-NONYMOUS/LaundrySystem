import { Head } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, History } from 'lucide-react';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { DateRangePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { dateTime, number, relative } from '@/lib/format';
import { index } from '@/routes/activity-log';
import type { Activity, Paginated, TableFilters } from '@/types/models';

type Props = {
    activities: Paginated<Activity>;
    filters: TableFilters;
    logNames: string[];
    users: { id: number; name: string }[];
};

const ALL = '__all__';

/** "express_surcharge_percent" → "Express surcharge percent" */
function fieldLabel(field: string): string {
    const text = field.replaceAll('_', ' ');

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function display(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    // Arrays/objects (e.g. JSON columns) — show them as JSON rather than "[object Object]".
    return JSON.stringify(value);
}

/**
 * Before → after table for one audit entry (old values struck through, new values bold).
 */
function ChangeTable({ activity }: { activity: Activity }) {
    const fields = [
        ...new Set([
            ...Object.keys(activity.new),
            ...Object.keys(activity.old),
        ]),
    ];

    if (fields.length === 0) {
        return (
            <p className="text-xs text-muted-foreground">
                No field changes were recorded.
            </p>
        );
    }

    return (
        <table className="w-full max-w-xl text-xs">
            <thead>
                <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-4 font-medium">Field</th>
                    <th className="py-1 pr-4 font-medium">Before</th>
                    <th className="py-1 font-medium">After</th>
                </tr>
            </thead>
            <tbody>
                {fields.map((field) => (
                    <tr key={field} className="border-t align-top">
                        <td className="py-1.5 pr-4 text-muted-foreground">
                            {fieldLabel(field)}
                        </td>
                        <td className="py-1.5 pr-4 break-all text-muted-foreground line-through">
                            {field in activity.old
                                ? display(activity.old[field])
                                : '—'}
                        </td>
                        <td className="py-1.5 font-medium break-all">
                            {display(activity.new[field])}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function ActivityLogIndex({
    activities,
    filters,
    logNames,
    users,
}: Props) {
    const { setParams } = useTableQuery();

    const columns: ColumnDef<Activity>[] = [
        {
            id: 'created_at',
            header: 'When',
            meta: { label: 'When', className: 'align-top whitespace-nowrap' },
            cell: ({ row }) => (
                <Tooltip>
                    <TooltipTrigger className="text-sm">
                        {relative(row.original.created_at)}
                    </TooltipTrigger>
                    <TooltipContent>
                        {dateTime(row.original.created_at)}
                    </TooltipContent>
                </Tooltip>
            ),
        },
        {
            id: 'causer',
            header: 'User',
            meta: { label: 'User', className: 'align-top' },
            cell: ({ row }) =>
                row.original.causer ?? (
                    <span className="text-muted-foreground">System</span>
                ),
        },
        {
            id: 'log_name',
            header: 'Module',
            meta: { label: 'Module', className: 'align-top' },
            cell: ({ row }) =>
                row.original.log_name ? (
                    <Badge variant="secondary" className="capitalize">
                        {row.original.log_name}
                    </Badge>
                ) : null,
        },
        {
            id: 'description',
            header: 'What changed',
            enableHiding: false,
            meta: { className: 'align-top' },
            cell: ({ row }) => {
                const activity = row.original;
                const changed = Object.keys(activity.new).length;

                return (
                    <Collapsible>
                        <div className="flex items-start gap-1">
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="-mt-1 size-7 shrink-0 data-[state=open]:[&>svg]:rotate-90"
                                    aria-label="Show changes"
                                    disabled={changed === 0}
                                >
                                    <ChevronRight className="transition-transform" />
                                </Button>
                            </CollapsibleTrigger>
                            <div className="min-w-0">
                                <span className="capitalize">
                                    {activity.description}
                                </span>
                                {activity.subject_type && (
                                    <span className="text-muted-foreground">
                                        {' · '}
                                        {activity.subject_type}{' '}
                                        <span className="font-mono text-xs text-foreground">
                                            {activity.subject_label}
                                        </span>
                                    </span>
                                )}
                                {changed > 0 && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        ({changed} field
                                        {changed === 1 ? '' : 's'})
                                    </span>
                                )}
                            </div>
                        </div>
                        <CollapsibleContent className="mt-2 ml-8 rounded-md bg-muted/50 p-3">
                            <ChangeTable activity={activity} />
                        </CollapsibleContent>
                    </Collapsible>
                );
            },
        },
    ];

    return (
        <>
            <Head title="Activity log" />
            <PageBody>
                <PageHeader
                    title="Activity log"
                    description={`Who changed prices, payments, orders and settings — ${number(activities.meta.total)} entries`}
                />

                <DataTable
                    tableId="activity-log"
                    columns={columns}
                    data={activities.data}
                    meta={activities.meta}
                    filters={filters}
                    toolbar={(table) => (
                        <DataTableToolbar
                            table={table}
                            searchPlaceholder="Search descriptions…"
                            filterKeys={['log', 'user', 'from', 'to']}
                        >
                            <Select
                                value={(filters.log as string | null) ?? ALL}
                                onValueChange={(value) =>
                                    setParams({
                                        log: value === ALL ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="h-8 w-36 border-dashed"
                                    aria-label="Module"
                                >
                                    <SelectValue placeholder="Module" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>
                                        All modules
                                    </SelectItem>
                                    {logNames.map((name) => (
                                        <SelectItem
                                            key={name}
                                            value={name}
                                            className="capitalize"
                                        >
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={
                                    filters.user ? String(filters.user) : ALL
                                }
                                onValueChange={(value) =>
                                    setParams({
                                        user: value === ALL ? null : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="h-8 w-40 border-dashed"
                                    aria-label="User"
                                >
                                    <SelectValue placeholder="User" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>
                                        All users
                                    </SelectItem>
                                    {users.map((user) => (
                                        <SelectItem
                                            key={user.id}
                                            value={String(user.id)}
                                        >
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <DateRangePicker
                                from={filters.from as string | null}
                                to={filters.to as string | null}
                                onChange={(range) => setParams(range)}
                            />
                        </DataTableToolbar>
                    )}
                    emptyState={
                        <EmptyState
                            icon={History}
                            title="No activity found"
                            description="Try a different filter or date range."
                        />
                    }
                />
            </PageBody>
        </>
    );
}

ActivityLogIndex.layout = {
    breadcrumbs: [{ title: 'Activity log', href: index() }],
};
