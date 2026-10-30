import { Head, Link, router } from '@inertiajs/react';
import { format, startOfMonth, subDays } from 'date-fns';
import {
    BadgePercent,
    ClipboardList,
    Download,
    FileDown,
    Receipt,
    Users,
    Wallet,
} from 'lucide-react';
import { DateRangePicker } from '@/components/date-picker';
import { PageBody, PageHeader } from '@/components/page-header';
import {
    CollectedBilledChart,
    PaymentMethodsChart,
    PeakHoursChart,
    TopServicesChart,
} from '@/components/reports/charts';
import {
    TopCustomersList,
    TopServicesTable,
} from '@/components/reports/top-lists';
import type {
    CompletedService,
    PaymentMethodTotal,
    PeakHour,
    SalesRow,
    TopCustomer,
    TopService,
} from '@/components/reports/types';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { date, isoDate, money, number, quantity } from '@/lib/format';
import { index as ordersIndex } from '@/routes/orders';
import { exportMethod, index, staff } from '@/routes/reports';
import type { OrderStatus } from '@/types/models';

type Props = {
    filters: { from: string; to: string };
    summary: {
        collected: number;
        billed: number;
        orders: number;
        average_order: number;
        discounts: number;
        express_fees: number;
    };
    sales: SalesRow[];
    topServices: TopService[];
    topCustomers: TopCustomer[];
    paymentMethods: PaymentMethodTotal[];
    peakHours: PeakHour[];
    completedServices: CompletedService[];
    pendingByStatus: Partial<Record<OrderStatus, number>>;
};

/** Preset ranges; each is just a from/to pair sent to the server. */
function presets(): { key: string; label: string; from: string; to: string }[] {
    const today = new Date();
    const to = isoDate(today);

    return [
        { key: 'today', label: 'Today', from: to, to },
        { key: '7', label: '7 days', from: isoDate(subDays(today, 6)), to },
        { key: '30', label: '30 days', from: isoDate(subDays(today, 29)), to },
        {
            key: 'month',
            label: 'This month',
            from: isoDate(startOfMonth(today)),
            to,
        },
    ];
}

const reportsForExport = [
    { key: 'sales', label: 'Sales' },
    { key: 'services', label: 'Completed services' },
    { key: 'staff', label: 'Staff activity' },
    { key: 'pending', label: 'Pending orders' },
] as const;

export default function ReportsIndex({
    filters,
    summary,
    sales,
    topServices,
    topCustomers,
    paymentMethods,
    peakHours,
    completedServices,
    pendingByStatus,
}: Props) {
    const ranges = presets();
    const activePreset =
        ranges.find(
            (range) => range.from === filters.from && range.to === filters.to,
        )?.key ?? '';
    const period =
        filters.from === filters.to
            ? date(filters.from)
            : `${date(filters.from)} – ${date(filters.to)}`;

    const visit = (range: { from: string | null; to: string | null }) =>
        router.get(
            index.url(),
            { from: range.from ?? undefined, to: range.to ?? undefined },
            { preserveScroll: true },
        );

    const pendingStatuses = (
        Object.keys(pendingByStatus) as OrderStatus[]
    ).filter((status) => (pendingByStatus[status] ?? 0) > 0);
    const pendingTotal = pendingStatuses.reduce(
        (sum, status) => sum + (pendingByStatus[status] ?? 0),
        0,
    );

    return (
        <>
            <Head title="Reports" />
            <PageBody>
                <PageHeader title="Reports" description={period}>
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={activePreset}
                        onValueChange={(key) => {
                            const preset = ranges.find(
                                (range) => range.key === key,
                            );

                            if (preset) {
                                visit(preset);
                            }
                        }}
                        className="hidden md:flex"
                    >
                        {ranges.map((range) => (
                            <ToggleGroupItem
                                key={range.key}
                                value={range.key}
                                className="px-3"
                            >
                                {range.label}
                            </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                    <DateRangePicker
                        from={filters.from}
                        to={filters.to}
                        onChange={(range) => range.from && visit(range)}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Download />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            {reportsForExport.map((report, position) => (
                                <DropdownMenuGroup key={report.key}>
                                    {position > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuLabel>
                                        {report.label}
                                    </DropdownMenuLabel>
                                    {(['pdf', 'xlsx'] as const).map(
                                        (fileFormat) => (
                                            <DropdownMenuItem
                                                key={fileFormat}
                                                asChild
                                            >
                                                <a
                                                    href={exportMethod.url(
                                                        report.key,
                                                        {
                                                            query: {
                                                                format: fileFormat,
                                                                from: filters.from,
                                                                to: filters.to,
                                                            },
                                                        },
                                                    )}
                                                >
                                                    <FileDown />
                                                    {fileFormat === 'pdf'
                                                        ? 'PDF'
                                                        : 'Excel'}
                                                </a>
                                            </DropdownMenuItem>
                                        ),
                                    )}
                                </DropdownMenuGroup>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </PageHeader>

                <Tabs defaultValue="overview" className="gap-4">
                    <TabsList className="h-auto flex-wrap">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="sales">Sales</TabsTrigger>
                        <TabsTrigger value="services">Services</TabsTrigger>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="staff">Staff</TabsTrigger>
                    </TabsList>

                    <TabsContent
                        value="overview"
                        className="flex flex-col gap-4"
                    >
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                            <StatCard
                                title="Collected"
                                icon={Wallet}
                                value={money(summary.collected)}
                                hint="Payments received"
                            />
                            <StatCard
                                title="Billed"
                                icon={Receipt}
                                value={money(summary.billed)}
                                hint="New orders' totals"
                            />
                            <StatCard
                                title="Orders"
                                icon={ClipboardList}
                                value={number(summary.orders)}
                                hint="Excluding cancelled"
                            />
                            <StatCard
                                title="Average order"
                                icon={Receipt}
                                value={money(summary.average_order)}
                                hint="Billed ÷ orders"
                            />
                            <StatCard
                                title="Discounts"
                                icon={BadgePercent}
                                value={money(summary.discounts)}
                                hint={`Express fees ${money(summary.express_fees)}`}
                                className="col-span-2 lg:col-span-1"
                            />
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Collected vs billed</CardTitle>
                                <CardDescription>
                                    Money received each day compared with the
                                    value of new orders
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-2 sm:px-6">
                                <CollectedBilledChart rows={sales} />
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Peak hours</CardTitle>
                                    <CardDescription>
                                        Orders received per hour of the day
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-2 sm:px-6">
                                    <PeakHoursChart
                                        data={peakHours}
                                        className="h-62.5"
                                    />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment methods</CardTitle>
                                    <CardDescription>
                                        Collections by method
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PaymentMethodsChart
                                        data={paymentMethods}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top services</CardTitle>
                                    <CardDescription>
                                        By revenue
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <TopServicesChart
                                        data={topServices.slice(0, 5)}
                                    />
                                    <TopServicesTable services={topServices} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top customers</CardTitle>
                                    <CardDescription>
                                        By amount spent
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <TopCustomersList
                                        customers={topCustomers}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="sales">
                        <SalesTable rows={sales} />
                    </TabsContent>

                    <TabsContent value="services">
                        <CompletedServicesTable rows={completedServices} />
                    </TabsContent>

                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending orders</CardTitle>
                                <CardDescription>
                                    {number(pendingTotal)} orders not yet
                                    completed, delivered or cancelled (right
                                    now, regardless of the date range)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingStatuses.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No pending orders.
                                    </p>
                                ) : (
                                    <ul className="divide-y">
                                        {pendingStatuses.map((status) => (
                                            <li key={status}>
                                                <Link
                                                    href={ordersIndex({
                                                        query: { status },
                                                    })}
                                                    className="flex items-center justify-between py-3 hover:underline"
                                                >
                                                    <StatusBadge
                                                        status={status}
                                                    />
                                                    <span className="font-medium tabular-nums">
                                                        {number(
                                                            pendingByStatus[
                                                                status
                                                            ] ?? 0,
                                                        )}{' '}
                                                        orders
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="staff">
                        <Card>
                            <CardHeader>
                                <CardTitle>Staff activity</CardTitle>
                                <CardDescription>
                                    Orders taken, status updates, payments
                                    collected and trips completed per staff
                                    member.
                                </CardDescription>
                                <CardAction>
                                    <Button asChild>
                                        <Link
                                            href={staff({
                                                query: {
                                                    from: filters.from,
                                                    to: filters.to,
                                                },
                                            })}
                                        >
                                            <Users />
                                            Open staff report
                                        </Link>
                                    </Button>
                                </CardAction>
                            </CardHeader>
                        </Card>
                    </TabsContent>
                </Tabs>
            </PageBody>
        </>
    );
}

function SalesTable({ rows }: { rows: SalesRow[] }) {
    const totals = rows.reduce(
        (sum, row) => ({
            orders: sum.orders + row.orders,
            billed: sum.billed + row.billed,
            express_fees: sum.express_fees + row.express_fees,
            discounts: sum.discounts + row.discounts,
            collected: sum.collected + row.collected,
        }),
        { orders: 0, billed: 0, express_fees: 0, discounts: 0, collected: 0 },
    );

    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Billed</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">
                            Express fees
                        </TableHead>
                        <TableHead className="hidden text-right sm:table-cell">
                            Discounts
                        </TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...rows].reverse().map((row) => (
                        <TableRow key={row.date}>
                            <TableCell className="whitespace-nowrap">
                                {format(
                                    new Date(`${row.date}T00:00:00`),
                                    'EEE, MMM d',
                                )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {number(row.orders)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {money(row.billed)}
                            </TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">
                                {money(row.express_fees)}
                            </TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">
                                {money(row.discounts)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                                {money(row.collected)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right tabular-nums">
                            {number(totals.orders)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(totals.billed)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                            {money(totals.express_fees)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">
                            {money(totals.discounts)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(totals.collected)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
}

function CompletedServicesTable({ rows }: { rows: CompletedService[] }) {
    if (rows.length === 0) {
        return (
            <Card>
                <CardContent>
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No orders were released in this period.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);

    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={`${row.service}-${row.unit}`}>
                            <TableCell className="font-medium">
                                {row.service}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {quantity(
                                    row.quantity,
                                    row.unit === 'per_kg' ? 'kg' : 'pc',
                                )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {number(row.orders)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                                {money(row.revenue)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell className="text-right tabular-nums">
                            {money(revenue)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [{ title: 'Reports', href: index() }],
};
