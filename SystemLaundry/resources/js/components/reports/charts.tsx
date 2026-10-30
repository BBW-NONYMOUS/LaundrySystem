import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Label,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';
import type {
    PaymentMethodTotal,
    PeakHour,
    SalesRow,
    SalesTrendPoint,
    TopService,
} from '@/components/reports/types';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { money } from '@/lib/format';

const shortDate = (value: string) => format(parseISO(value), 'MMM d');

/** Axis ticks like ₱1.2k so long amounts don't crowd the chart. */
const compactMoney = (value: number) =>
    value >= 1000 ? `₱${(value / 1000).toFixed(1)}k` : `₱${value}`;

const salesConfig = {
    sales: { label: 'Collected', color: 'var(--chart-1)' },
    orders: { label: 'Orders', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/**
 * Dashboard sales trend: the dashboard-01 interactive area chart with a 7 / 30 day switch
 * (ToggleGroup on wide cards, Select on narrow ones).
 */
export function SalesTrendCard({ data }: { data: SalesTrendPoint[] }) {
    const [range, setRange] = useState<'7' | '30'>('30');
    const visible = data.slice(-Number(range));
    const total = visible.reduce((sum, point) => sum + point.sales, 0);

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Sales collected</CardTitle>
                <CardDescription>
                    {money(total)} in the last {range} days
                </CardDescription>
                <CardAction>
                    <ToggleGroup
                        type="single"
                        value={range}
                        onValueChange={(value) =>
                            value && setRange(value as '7' | '30')
                        }
                        variant="outline"
                        className="hidden *:data-[slot=toggle-group-item]:px-4! @[540px]/card:flex"
                    >
                        <ToggleGroupItem value="30">
                            Last 30 days
                        </ToggleGroupItem>
                        <ToggleGroupItem value="7">Last 7 days</ToggleGroupItem>
                    </ToggleGroup>
                    <Select
                        value={range}
                        onValueChange={(value) => setRange(value as '7' | '30')}
                    >
                        <SelectTrigger
                            className="flex w-36 @[540px]/card:hidden"
                            size="sm"
                            aria-label="Date range"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="7">Last 7 days</SelectItem>
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
                <ChartContainer
                    config={salesConfig}
                    className="aspect-auto h-62.5 w-full"
                >
                    <AreaChart data={visible} margin={{ left: 4, right: 12 }}>
                        <defs>
                            <linearGradient
                                id="fillSales"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-sales)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-sales)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={shortDate}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            width={48}
                            tickFormatter={compactMoney}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    labelFormatter={(value) =>
                                        format(
                                            parseISO(String(value)),
                                            'EEE, MMM d',
                                        )
                                    }
                                    formatter={(value) => money(Number(value))}
                                />
                            }
                        />
                        <Area
                            dataKey="sales"
                            type="natural"
                            fill="url(#fillSales)"
                            stroke="var(--color-sales)"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

const billedConfig = {
    collected: { label: 'Collected', color: 'var(--chart-1)' },
    billed: { label: 'Billed', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/**
 * Reports: money collected (payments) vs billed (new orders) per day.
 */
export function CollectedBilledChart({ rows }: { rows: SalesRow[] }) {
    return (
        <ChartContainer
            config={billedConfig}
            className="aspect-auto h-70 w-full"
        >
            <AreaChart data={rows} margin={{ left: 4, right: 12 }}>
                <defs>
                    <linearGradient
                        id="fillCollected"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="5%"
                            stopColor="var(--color-collected)"
                            stopOpacity={0.8}
                        />
                        <stop
                            offset="95%"
                            stopColor="var(--color-collected)"
                            stopOpacity={0.1}
                        />
                    </linearGradient>
                    <linearGradient id="fillBilled" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="5%"
                            stopColor="var(--color-billed)"
                            stopOpacity={0.5}
                        />
                        <stop
                            offset="95%"
                            stopColor="var(--color-billed)"
                            stopOpacity={0.05}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={shortDate}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={compactMoney}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            indicator="dot"
                            labelFormatter={(value) =>
                                format(parseISO(String(value)), 'EEE, MMM d')
                            }
                            formatter={(value, name) => (
                                <span className="flex w-full justify-between gap-4">
                                    <span className="text-muted-foreground">
                                        {billedConfig[
                                            name as keyof typeof billedConfig
                                        ]?.label ?? name}
                                    </span>
                                    <span className="font-mono font-medium tabular-nums">
                                        {money(Number(value))}
                                    </span>
                                </span>
                            )}
                        />
                    }
                />
                <Area
                    dataKey="billed"
                    type="natural"
                    fill="url(#fillBilled)"
                    stroke="var(--color-billed)"
                />
                <Area
                    dataKey="collected"
                    type="natural"
                    fill="url(#fillCollected)"
                    stroke="var(--color-collected)"
                />
                <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
        </ChartContainer>
    );
}

const peakConfig = {
    orders: { label: 'Orders', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/**
 * Orders received per hour of the day; the busiest hours are drawn in full color.
 */
export function PeakHoursChart({
    data,
    className = 'h-55',
}: {
    data: PeakHour[];
    className?: string;
}) {
    const max = Math.max(...data.map((hour) => hour.orders), 0);

    return (
        <ChartContainer
            config={peakConfig}
            className={`aspect-auto w-full ${className}`}
        >
            <BarChart data={data} margin={{ left: -16, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideIndicator />}
                />
                <Bar dataKey="orders" radius={4}>
                    {data.map((hour) => (
                        <Cell
                            key={hour.hour}
                            fill="var(--color-orders)"
                            fillOpacity={
                                max > 0 && hour.orders >= max * 0.75 ? 1 : 0.45
                            }
                        />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}

const servicesConfig = {
    revenue: { label: 'Revenue', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/**
 * Horizontal bars of revenue per service (names stay readable).
 */
export function TopServicesChart({ data }: { data: TopService[] }) {
    return (
        <ChartContainer
            config={servicesConfig}
            className="aspect-auto h-55 w-full"
        >
            <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 0, right: 16 }}
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="service"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={120}
                    tick={{ fontSize: 11 }}
                />
                <XAxis type="number" hide />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            hideIndicator
                            formatter={(value) => money(Number(value))}
                        />
                    }
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </BarChart>
        </ChartContainer>
    );
}

const methodColors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

/**
 * Donut of collections by payment method with the total in the middle.
 */
export function PaymentMethodsChart({ data }: { data: PaymentMethodTotal[] }) {
    const used = data.filter((method) => method.amount > 0);
    const total = used.reduce((sum, method) => sum + method.amount, 0);
    const config: ChartConfig = Object.fromEntries(
        data.map((method, index) => [
            method.method,
            {
                label: method.label,
                color: methodColors[index % methodColors.length],
            },
        ]),
    );

    if (used.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No payments in this period.
            </p>
        );
    }

    return (
        <ChartContainer
            config={config}
            className="mx-auto aspect-square max-h-60"
        >
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            hideLabel
                            nameKey="method"
                            formatter={(value, name) =>
                                `${used.find((method) => method.method === name)?.label ?? String(name)}: ${money(Number(value))}`
                            }
                        />
                    }
                />
                <Pie
                    data={used}
                    dataKey="amount"
                    nameKey="method"
                    innerRadius={58}
                    strokeWidth={4}
                >
                    {used.map((method) => (
                        <Cell
                            key={method.method}
                            fill={`var(--color-${method.method})`}
                        />
                    ))}
                    <Label
                        content={({ viewBox }) =>
                            viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                                <text
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    <tspan
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        className="fill-foreground text-lg font-semibold"
                                    >
                                        {compactMoney(Math.round(total))}
                                    </tspan>
                                    <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy ?? 0) + 20}
                                        className="fill-muted-foreground text-xs"
                                    >
                                        collected
                                    </tspan>
                                </text>
                            ) : null
                        }
                    />
                </Pie>
                <ChartLegend
                    content={<ChartLegendContent nameKey="method" />}
                    className="flex-wrap gap-2"
                />
            </PieChart>
        </ChartContainer>
    );
}
