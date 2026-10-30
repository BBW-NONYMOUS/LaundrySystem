import { Deferred, Head, Link, usePoll } from '@inertiajs/react';
import {
    AlarmClock,
    CalendarClock,
    ClipboardList,
    KanbanSquare,
    PackageCheck,
    PackageOpen,
    Plus,
    ScanLine,
    Wallet,
    WashingMachine,
} from 'lucide-react';
import { PageBody, PageHeader } from '@/components/page-header';
import {
    PaymentMethodsChart,
    PeakHoursChart,
    SalesTrendCard,
    TopServicesChart,
} from '@/components/reports/charts';
import { RecentOrdersTable } from '@/components/reports/recent-orders-table';
import { TopCustomersList } from '@/components/reports/top-lists';
import type {
    DashboardStats,
    PaymentMethodTotal,
    PeakHour,
    SalesTrendPoint,
    TopCustomer,
    TopService,
} from '@/components/reports/types';
import { percentChange, StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { money, number } from '@/lib/format';
import { dashboard } from '@/routes';
import { index as deliveries } from '@/routes/deliveries';
import { overdue, unclaimed } from '@/routes/monitoring';
import { board, create, index as orders } from '@/routes/orders';
import { index as scan } from '@/routes/scan';
import type { Order } from '@/types/models';

type Analytics = {
    range: { from: string; to: string };
    salesTrend: SalesTrendPoint[];
    peakHours: PeakHour[];
    topServices: TopService[];
    topCustomers: TopCustomer[];
    paymentMethods: PaymentMethodTotal[];
};

type Props = {
    stats: DashboardStats | null;
    recentOrders: Order[];
    /** Deferred for the owner (undefined until loaded); null for everyone else. */
    analytics?: Analytics | null;
};

const IN_PROCESS = 'received,washing,drying,folding';

export default function Dashboard({ stats, recentOrders, analytics }: Props) {
    const { can } = usePermissions();
    const isOwner = can('dashboard.view-analytics');

    // Counter staff watch live numbers; the owner's analytics don't need to refresh.
    usePoll(
        15000,
        { only: ['stats', 'recentOrders', 'navCounts'] },
        { autoStart: stats !== null && !isOwner },
    );

    if (!stats) {
        return (
            <>
                <Head title="Dashboard" />
                <PageBody>
                    <PageHeader
                        title="Welcome"
                        description="Your account has no dashboard yet. Ask the shop owner to assign your role."
                    />
                </PageBody>
            </>
        );
    }

    return (
        <>
            <Head title="Dashboard" />
            <PageBody>
                {isOwner ? (
                    <OwnerDashboard
                        stats={stats}
                        recentOrders={recentOrders}
                        analytics={analytics}
                    />
                ) : (
                    <CounterDashboard
                        stats={stats}
                        recentOrders={recentOrders}
                        canCreate={can('orders.create')}
                    />
                )}
            </PageBody>
        </>
    );
}

function OwnerDashboard({
    stats,
    recentOrders,
    analytics,
}: {
    stats: DashboardStats;
    recentOrders: Order[];
    analytics?: Analytics | null;
}) {
    return (
        <>
            <PageHeader
                title="Dashboard"
                description="How the shop is doing today and over the last 30 days."
            >
                <Button asChild>
                    <Link href={create()}>
                        <Plus />
                        New order
                    </Link>
                </Button>
            </PageHeader>

            {/* dashboard-01 "SectionCards" */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Sales today"
                    icon={Wallet}
                    value={money(stats.sales_today)}
                    trend={percentChange(
                        stats.sales_today,
                        stats.sales_yesterday,
                    )}
                    footer={`${money(stats.sales_yesterday)} yesterday`}
                    hint="Payments collected"
                />
                <StatCard
                    title="Orders today"
                    icon={ClipboardList}
                    value={number(stats.orders_today)}
                    trend={percentChange(
                        stats.orders_today,
                        stats.orders_yesterday,
                    )}
                    footer={`${number(stats.orders_yesterday)} yesterday`}
                    hint="New orders received"
                    href={orders()}
                />
                <StatCard
                    title="In process"
                    icon={WashingMachine}
                    value={number(stats.in_process)}
                    tone={stats.overdue > 0 ? 'warning' : 'default'}
                    footer={
                        stats.overdue > 0
                            ? `${number(stats.overdue)} overdue`
                            : 'Nothing overdue'
                    }
                    hint="Received, washing, drying or folding"
                    href={orders({ query: { status: IN_PROCESS } })}
                />
                <StatCard
                    title="Receivables"
                    icon={PackageCheck}
                    value={money(stats.receivables)}
                    footer={`${number(stats.ready)} ready for pickup`}
                    hint="Unpaid balances on open orders"
                    href={orders({ query: { payment_status: 'unpaid' } })}
                />
            </div>

            <Deferred data="analytics" fallback={<AnalyticsSkeleton />}>
                {analytics ? (
                    <AnalyticsSection analytics={analytics} />
                ) : (
                    <AnalyticsSkeleton />
                )}
            </Deferred>

            <RecentOrdersCard orders={recentOrders} />
        </>
    );
}

function AnalyticsSection({ analytics }: { analytics: Analytics }) {
    return (
        <>
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SalesTrendCard data={analytics.salesTrend} />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Peak hours</CardTitle>
                        <CardDescription>
                            Orders received per hour, last 30 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                        <PeakHoursChart
                            data={analytics.peakHours}
                            className="h-62.5"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Top services</CardTitle>
                        <CardDescription>
                            By revenue, last 30 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                        <TopServicesChart data={analytics.topServices} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Payment methods</CardTitle>
                        <CardDescription>
                            Collections, last 30 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PaymentMethodsChart data={analytics.paymentMethods} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Top customers</CardTitle>
                        <CardDescription>
                            By amount spent, last 30 days
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TopCustomersList customers={analytics.topCustomers} />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function AnalyticsSkeleton() {
    return (
        <>
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-90 rounded-xl lg:col-span-2" />
                <Skeleton className="h-90 rounded-xl" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="h-80 rounded-xl" />
                <Skeleton className="h-80 rounded-xl" />
                <Skeleton className="h-80 rounded-xl" />
            </div>
        </>
    );
}

/**
 * Cashier / laundry staff: quick actions and today's live counters.
 */
function CounterDashboard({
    stats,
    recentOrders,
    canCreate,
}: {
    stats: DashboardStats;
    recentOrders: Order[];
    canCreate: boolean;
}) {
    return (
        <>
            <PageHeader
                title="Dashboard"
                description="Live numbers for the counter. Updates every 15 seconds."
            />

            <div className="grid gap-3 sm:grid-cols-3">
                {canCreate && (
                    <Button
                        asChild
                        size="lg"
                        className="h-14 justify-start text-base"
                    >
                        <Link href={create()}>
                            <Plus />
                            New order
                            <Kbd className="ml-auto bg-primary-foreground/20 text-primary-foreground">
                                Alt N
                            </Kbd>
                        </Link>
                    </Button>
                )}
                <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 justify-start text-base"
                >
                    <Link href={scan()}>
                        <ScanLine />
                        Scan a bag tag
                        <Kbd className="ml-auto">Alt S</Kbd>
                    </Link>
                </Button>
                <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 justify-start text-base"
                >
                    <Link href={board()}>
                        <KanbanSquare />
                        Status board
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard
                    title="In process"
                    icon={WashingMachine}
                    value={number(stats.in_process)}
                    href={orders({ query: { status: IN_PROCESS } })}
                />
                <StatCard
                    title="Ready"
                    icon={PackageCheck}
                    value={number(stats.ready)}
                    tone="success"
                    href={orders({ query: { status: 'ready' } })}
                />
                <StatCard
                    title="Overdue"
                    icon={AlarmClock}
                    value={number(stats.overdue)}
                    tone={stats.overdue > 0 ? 'destructive' : 'default'}
                    href={overdue()}
                />
                <StatCard
                    title="Unclaimed"
                    icon={PackageOpen}
                    value={number(stats.unclaimed)}
                    tone={stats.unclaimed > 0 ? 'warning' : 'default'}
                    href={unclaimed()}
                />
                <StatCard
                    title="Pickups booked"
                    icon={CalendarClock}
                    value={number(stats.pending_pickups)}
                    href={deliveries()}
                    className="col-span-2 lg:col-span-1"
                />
            </div>

            <RecentOrdersCard orders={recentOrders} />
        </>
    );
}

function RecentOrdersCard({ orders: recent }: { orders: Order[] }) {
    return (
        <Card className="gap-4">
            <CardHeader>
                <CardTitle>Recent orders</CardTitle>
                <CardDescription>
                    The latest orders taken at the counter
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={orders()}>View all</Link>
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
                <RecentOrdersTable orders={recent} />
            </CardContent>
        </Card>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
