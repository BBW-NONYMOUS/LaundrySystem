import { Head, router } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    Banknote,
    FileDown,
    PackageCheck,
    Printer,
    Receipt,
    Wallet,
} from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { PageBody, PageHeader } from '@/components/page-header';
import type { DailySummary } from '@/components/reports/types';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { money, number } from '@/lib/format';
import { daily, exportMethod } from '@/routes/reports';

/**
 * End-of-day closing summary (feature: daily transaction summaries). Prints cleanly.
 */
export default function DailyReport({ summary }: { summary: DailySummary }) {
    const day = parseISO(summary.date);
    const methodsUsed = summary.by_method.filter((method) => method.count > 0);

    return (
        <>
            <Head title={`Daily summary · ${format(day, 'MMM d')}`} />
            <PageBody>
                <PageHeader
                    title="Daily summary"
                    description={format(day, 'EEEE, MMMM d, yyyy')}
                >
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <DatePicker
                            value={summary.date}
                            onChange={(value) =>
                                router.get(
                                    daily.url(),
                                    { date: value },
                                    { preserveScroll: true },
                                )
                            }
                            className="w-56"
                        />
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                        >
                            <Printer />
                            Print
                        </Button>
                        <Button asChild>
                            <a
                                href={exportMethod.url('daily', {
                                    query: { date: summary.date },
                                })}
                            >
                                <FileDown />
                                Download PDF
                            </a>
                        </Button>
                    </div>
                </PageHeader>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        title="Collected"
                        icon={Wallet}
                        value={money(summary.collected)}
                        hint="All valid payments"
                    />
                    <StatCard
                        title="Cash on hand"
                        icon={Banknote}
                        value={money(summary.cash_on_hand)}
                        hint="Cash payments only"
                        tone="success"
                    />
                    <StatCard
                        title="Orders received"
                        icon={Receipt}
                        value={number(summary.orders_received)}
                        hint={`${number(summary.express_orders)} express`}
                    />
                    <StatCard
                        title="Orders released"
                        icon={PackageCheck}
                        value={number(summary.orders_released)}
                        hint="Claimed or delivered"
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Orders</CardTitle>
                            <CardDescription>
                                New orders taken today
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <dl className="divide-y text-sm">
                                <SummaryRow
                                    label="Billed (new orders)"
                                    value={money(summary.billed)}
                                />
                                <SummaryRow
                                    label="Express orders"
                                    value={number(summary.express_orders)}
                                />
                                <SummaryRow
                                    label="Discounts given"
                                    value={money(summary.discounts)}
                                />
                                <SummaryRow
                                    label="Cancelled orders"
                                    value={number(summary.orders_cancelled)}
                                />
                                <SummaryRow
                                    label="Voided payments"
                                    value={`${number(summary.voided_count)} (${money(summary.voided_amount)})`}
                                    destructive={summary.voided_count > 0}
                                />
                            </dl>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>By payment method</CardTitle>
                            <CardDescription>
                                Match against the cash drawer and e-wallet apps
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">
                                            Count
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Amount
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.by_method.map((method) => (
                                        <TableRow
                                            key={method.method}
                                            className={
                                                method.count === 0
                                                    ? 'text-muted-foreground'
                                                    : undefined
                                            }
                                        >
                                            <TableCell>
                                                {method.label}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {number(method.count)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {money(method.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell>Total</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {number(
                                                methodsUsed.reduce(
                                                    (sum, method) =>
                                                        sum + method.count,
                                                    0,
                                                ),
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {money(summary.collected)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>By staff</CardTitle>
                            <CardDescription>
                                Who received the money
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            {summary.by_cashier.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No payments recorded.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Staff</TableHead>
                                            <TableHead className="text-right">
                                                Count
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Amount
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {summary.by_cashier.map(
                                            (row, index) => (
                                                <TableRow
                                                    key={`${row.name}-${index}`}
                                                >
                                                    <TableCell>
                                                        {row.name ?? 'Unknown'}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {number(row.count)}
                                                    </TableCell>
                                                    <TableCell className="text-right tabular-nums">
                                                        {money(row.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Only on paper: signature lines for the closing handover. */}
                <div className="hidden grid-cols-2 gap-16 pt-12 text-sm print:grid">
                    <div className="border-t border-foreground pt-1">
                        Prepared by (Cashier)
                    </div>
                    <div className="border-t border-foreground pt-1">
                        Checked by (Owner)
                    </div>
                </div>
            </PageBody>
        </>
    );
}

function SummaryRow({
    label,
    value,
    destructive = false,
}: {
    label: string;
    value: string;
    destructive?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
                className={
                    destructive
                        ? 'font-medium text-destructive tabular-nums'
                        : 'font-medium tabular-nums'
                }
            >
                {value}
            </dd>
        </div>
    );
}

DailyReport.layout = {
    breadcrumbs: [{ title: 'Daily summary', href: daily() }],
};
