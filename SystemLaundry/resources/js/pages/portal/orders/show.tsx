import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, MapPin, Truck } from 'lucide-react';
import { OrderStepper } from '@/components/order-stepper';
import {
    OrderItemsTable,
    OrderTotals,
} from '@/components/portal/order-summary';
import {
    DeliveryStatusBadge,
    ExpressBadge,
    StatusBadge,
} from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dateTime, friendlyDateTime, money } from '@/lib/format';
import { index as portalHome } from '@/routes/portal';
import type { Order } from '@/types/models';

/**
 * Read-only order page for the customer: progress, items, payments and pickup/delivery.
 */
export default function PortalOrderShow({ order }: { order: Order }) {
    const deliveries = order.deliveries ?? [];
    const payments = order.payments ?? [];
    const hasDelivery = deliveries.some((trip) => trip.type === 'delivery');

    return (
        <>
            <Head title={`Order ${order.order_number}`} />
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 w-fit"
                        asChild
                    >
                        <Link href={portalHome()}>
                            <ArrowLeft /> My orders
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-mono text-2xl font-semibold tracking-tight">
                            {order.order_number}
                        </h1>
                        <StatusBadge status={order.status} size="lg" />
                        {order.is_express && <ExpressBadge />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {order.received_at
                            ? `Received ${dateTime(order.received_at)}`
                            : 'Booked for pickup'}
                        {order.due_at &&
                        order.status !== 'cancelled' &&
                        !order.completed_at
                            ? ` · Ready by ${friendlyDateTime(order.due_at)}`
                            : ''}
                    </p>
                </div>

                <Card>
                    <CardContent>
                        <OrderStepper
                            status={order.status}
                            history={order.status_histories}
                            hasDelivery={hasDelivery}
                        />
                        {order.status === 'cancelled' &&
                            order.cancellation_reason && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Reason: {order.cancellation_reason}
                                </p>
                            )}
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <OrderItemsTable order={order} />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <OrderTotals order={order} />
                            </CardContent>
                        </Card>

                        {deliveries.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Pickup & delivery</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    {deliveries.map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="grid gap-1 text-sm"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2 font-medium">
                                                    <Truck className="size-4 text-muted-foreground" />
                                                    {trip.type_label}
                                                </span>
                                                <DeliveryStatusBadge
                                                    status={trip.status}
                                                    label={trip.status_label}
                                                />
                                            </div>
                                            <span>
                                                {friendlyDateTime(
                                                    trip.scheduled_at,
                                                )}
                                            </span>
                                            <span className="flex items-start gap-1 text-muted-foreground">
                                                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                                                {trip.address}
                                            </span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {payments.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payments</CardTitle>
                                    <CardDescription>
                                        Thank you!
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-2 text-sm">
                                    {payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex justify-between gap-4"
                                        >
                                            <span className="text-muted-foreground">
                                                {payment.method_label} ·{' '}
                                                {dateTime(payment.paid_at)}
                                            </span>
                                            <span className="tabular-nums">
                                                {money(payment.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {order.special_instructions && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Your notes</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm whitespace-pre-line">
                            {order.special_instructions}
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
