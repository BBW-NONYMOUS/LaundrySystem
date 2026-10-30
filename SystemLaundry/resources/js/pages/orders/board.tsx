import { Head, Link, router, usePoll } from '@inertiajs/react';
import { AlarmClock, ArrowRight, Package, Zap } from 'lucide-react';
import { useState } from 'react';
import { PageBody, PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { dateTime, hoursUntil, relative } from '@/lib/format';
import { orderStatusStyles } from '@/lib/status';
import { cn } from '@/lib/utils';
import { board, show } from '@/routes/orders';
import { update as updateStatus } from '@/routes/orders/status';
import type { Order, OrderStatus } from '@/types/models';

type Column = {
    status: OrderStatus;
    label: string;
    color: string;
    orders: Order[];
};

/**
 * One-tap moves on the board. Pickups must be weighed first and release happens at the
 * counter, so only the in-shop processing steps get a "next" button here.
 */
const nextStep: Partial<Record<OrderStatus, OrderStatus>> = {
    received: 'washing',
    washing: 'drying',
    drying: 'folding',
    folding: 'ready',
};

export default function OrdersBoard({ columns }: { columns: Column[] }) {
    const { can } = usePermissions();
    const [expressOnly, setExpressOnly] = useState(false);
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [moving, setMoving] = useState<number | null>(null);

    // Live board: refresh every 15 s without stealing focus.
    usePoll(15000, { only: ['columns'] });

    const visible = (order: Order) =>
        (!expressOnly || order.is_express) &&
        (!overdueOnly || order.is_overdue);

    const advance = (order: Order, to: OrderStatus) => {
        setMoving(order.id);
        router.post(
            updateStatus.url(order.id),
            { status: to },
            {
                preserveScroll: true,
                only: ['columns', 'navCounts'],
                onFinish: () => setMoving(null),
            },
        );
    };

    return (
        <>
            <Head title="Status board" />
            <PageBody className="max-w-none">
                <PageHeader
                    title="Status board"
                    description="Laundry currently in the shop. Updates every 15 seconds."
                >
                    <Toggle
                        variant="outline"
                        pressed={expressOnly}
                        onPressedChange={setExpressOnly}
                        aria-label="Express only"
                    >
                        <Zap /> Express only
                    </Toggle>
                    <Toggle
                        variant="outline"
                        pressed={overdueOnly}
                        onPressedChange={setOverdueOnly}
                        aria-label="Overdue only"
                    >
                        <AlarmClock /> Overdue only
                    </Toggle>
                </PageHeader>

                <ScrollArea className="w-full pb-3">
                    <div className="flex gap-4">
                        {columns.map((column) => {
                            const style = orderStatusStyles[column.status];
                            const orders = column.orders.filter(visible);

                            return (
                                <section
                                    key={column.status}
                                    className="flex w-72 shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
                                    aria-label={column.label}
                                >
                                    <header className="flex items-center gap-2 px-1">
                                        <span
                                            className={cn(
                                                'size-2.5 rounded-full',
                                                style.dot,
                                            )}
                                            aria-hidden
                                        />
                                        <h2 className="text-sm font-semibold">
                                            {column.label}
                                        </h2>
                                        <Badge
                                            variant="secondary"
                                            className="ml-auto tabular-nums"
                                        >
                                            {orders.length}
                                        </Badge>
                                    </header>

                                    {orders.length === 0 ? (
                                        <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                                            Nothing here
                                        </p>
                                    ) : (
                                        orders.map((order) => (
                                            <BoardCard
                                                key={order.id}
                                                order={order}
                                                next={
                                                    can('orders.update-status')
                                                        ? nextStep[order.status]
                                                        : undefined
                                                }
                                                busy={moving === order.id}
                                                onAdvance={advance}
                                            />
                                        ))
                                    )}
                                </section>
                            );
                        })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </PageBody>
        </>
    );
}

function BoardCard({
    order,
    next,
    busy,
    onAdvance,
}: {
    order: Order;
    next?: OrderStatus;
    busy: boolean;
    onAdvance: (order: Order, to: OrderStatus) => void;
}) {
    const hours = hoursUntil(order.due_at);
    const dueTone = order.is_overdue
        ? 'text-destructive'
        : hours !== null && hours < 2
          ? 'text-warning'
          : 'text-muted-foreground';

    return (
        <Card
            className={cn(
                'gap-2 py-3 shadow-xs',
                order.is_overdue && 'border-destructive/40',
            )}
        >
            <div className="flex items-start gap-2 px-3">
                <Link href={show(order.id)} className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold hover:underline">
                            {order.order_number}
                        </span>
                        {order.is_express && (
                            <Zap
                                className="size-3.5 text-warning"
                                aria-label="Express"
                            />
                        )}
                    </div>
                    <div className="truncate text-sm font-medium">
                        {order.customer?.name}
                    </div>
                </Link>
                {next && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="size-8 shrink-0"
                                disabled={busy}
                                onClick={() => onAdvance(order, next)}
                                aria-label={`Move ${order.order_number} to ${orderStatusStyles[next].label}`}
                            >
                                <ArrowRight />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Move to {orderStatusStyles[next].label}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            <div className="flex items-center gap-3 px-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                    <Package className="size-3.5" />
                    {order.items_count ?? 0}{' '}
                    {order.items_count === 1 ? 'item' : 'items'}
                </span>
                {order.due_at && (
                    <Tooltip>
                        <TooltipTrigger
                            className={cn(
                                'ml-auto flex items-center gap-1',
                                dueTone,
                            )}
                        >
                            {order.is_overdue && (
                                <AlarmClock className="size-3.5" />
                            )}
                            {order.is_overdue ? 'Overdue ' : 'Due '}
                            {relative(order.due_at)}
                        </TooltipTrigger>
                        <TooltipContent>
                            {dateTime(order.due_at)}
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </Card>
    );
}

OrdersBoard.layout = {
    breadcrumbs: [{ title: 'Status board', href: board() }],
};
