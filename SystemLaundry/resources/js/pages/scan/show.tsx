import { Head, Link, router } from '@inertiajs/react';
import { ScanLine, StickyNote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { rememberScan } from '@/components/orders/recent-scans';
import { PageBody } from '@/components/page-header';
import {
    ExpressBadge,
    OverdueBadge,
    StatusBadge,
} from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { friendlyDateTime, quantity } from '@/lib/format';
import { orderStatusStyles } from '@/lib/status';
import { cn } from '@/lib/utils';
import { show as showOrder } from '@/routes/orders';
import { update as updateStatus } from '@/routes/orders/status';
import { index, show } from '@/routes/scan';
import type { Option, Order, OrderStatus } from '@/types/models';

type Props = {
    order: Order;
    nextStatuses: Option<OrderStatus>[];
};

/**
 * After a scan: what's in the bag and giant next-status buttons. A successful tap goes
 * back to the scan box after 2 s so staff can scan bag after bag.
 */
export default function ScanShow({ order, nextStatuses }: Props) {
    const [processing, setProcessing] = useState<OrderStatus | null>(null);
    const [done, setDone] = useState(false);
    const pieces = (order.items ?? []).reduce(
        (sum, item) => sum + (item.piece_count ?? 0),
        0,
    );

    useEffect(() => {
        rememberScan({
            orderNumber: order.order_number,
            customer: order.customer?.name ?? null,
            at: new Date().toISOString(),
        });
    }, [order.order_number, order.customer?.name]);

    const move = (status: OrderStatus) => {
        setProcessing(status);
        router.post(
            updateStatus.url(order.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDone(true);
                    window.setTimeout(() => router.visit(index()), 2000);
                },
                onFinish: () => setProcessing(null),
            },
        );
    };

    return (
        <>
            <Head title={`Scan ${order.order_number}`} />
            <PageBody className="max-w-2xl">
                <Card>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <Link
                                    href={showOrder(order.id)}
                                    className="font-mono text-2xl font-semibold hover:underline"
                                >
                                    {order.order_number}
                                </Link>
                                <p className="text-lg">
                                    {order.customer?.name}
                                </p>
                                <p className="font-mono text-sm text-muted-foreground">
                                    {order.customer?.phone}
                                </p>
                            </div>
                            <StatusBadge status={order.status} size="lg" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {order.is_express && <ExpressBadge />}
                            {order.is_overdue && <OverdueBadge />}
                            {order.due_at && (
                                <span className="text-sm text-muted-foreground">
                                    Due {friendlyDateTime(order.due_at)}
                                </span>
                            )}
                        </div>

                        <ul className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
                            {(order.items ?? []).map((item) => (
                                <li
                                    key={item.id}
                                    className="flex justify-between gap-2"
                                >
                                    <span className="font-medium">
                                        {item.service_name}
                                    </span>
                                    <span className="tabular-nums">
                                        {quantity(
                                            item.quantity,
                                            item.unit_short,
                                        )}
                                        {item.piece_count
                                            ? ` · ${item.piece_count} pcs`
                                            : ''}
                                    </span>
                                </li>
                            ))}
                            {pieces > 0 && (
                                <li className="border-t pt-1 text-right font-semibold tabular-nums">
                                    {pieces} pieces in total
                                </li>
                            )}
                        </ul>

                        {order.special_instructions && (
                            <Alert>
                                <StickyNote />
                                <AlertTitle>Special instructions</AlertTitle>
                                <AlertDescription className="text-base whitespace-pre-line">
                                    {order.special_instructions}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {done ? (
                    <p className="text-center text-sm text-muted-foreground">
                        Saved. Returning to the scanner…
                    </p>
                ) : nextStatuses.length > 0 ? (
                    <div className="grid gap-3">
                        {nextStatuses.map((status) => {
                            const style = orderStatusStyles[status.value];

                            return (
                                <Button
                                    key={status.value}
                                    onClick={() => move(status.value)}
                                    disabled={processing !== null}
                                    className={cn(
                                        'h-16 text-lg [&_svg]:size-6!',
                                        style.solid,
                                    )}
                                >
                                    {processing === status.value ? (
                                        <Spinner />
                                    ) : (
                                        <style.icon />
                                    )}
                                    Move to {status.label}
                                </Button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground">
                        Nothing to do here at the machines — this order is
                        handled at the counter.
                    </p>
                )}

                <Button variant="outline" size="lg" className="h-12" asChild>
                    <Link href={index()}>
                        <ScanLine /> Scan another bag
                    </Link>
                </Button>
            </PageBody>
        </>
    );
}

ScanShow.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Scan', href: index() },
        {
            title: props.order.order_number,
            href: show(props.order.order_number),
        },
    ],
});
