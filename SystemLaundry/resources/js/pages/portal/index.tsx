import { Head, Link, router } from '@inertiajs/react';
import { CalendarPlus, ChevronLeft, ChevronRight, Shirt } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { OrderStepper } from '@/components/order-stepper';
import { PageHeader } from '@/components/page-header';
import {
    ExpressBadge,
    PaymentBadge,
    StatusBadge,
} from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { date, friendlyDateTime, money } from '@/lib/format';
import { create as bookPickup } from '@/routes/portal/bookings';
import { show } from '@/routes/portal/orders';
import type { Customer, Order, Paginated } from '@/types/models';

type Props = {
    customer: Customer;
    activeOrders: Order[];
    pastOrders: Paginated<Order>;
};

/**
 * Customer portal home: laundry in progress (with a stepper each) and order history.
 */
export default function PortalHome({
    customer,
    activeOrders,
    pastOrders,
}: Props) {
    const firstName = customer.name.split(' ')[0];

    return (
        <>
            <Head title="My orders" />
            <div className="flex flex-col gap-6">
                <PageHeader
                    title={`Hi, ${firstName}!`}
                    description="Follow your laundry from drop-off to pickup."
                >
                    <Button asChild>
                        <Link href={bookPickup()}>
                            <CalendarPlus />
                            Book a pickup
                        </Link>
                    </Button>
                </PageHeader>

                <section className="grid gap-4">
                    <h2 className="text-base font-semibold">In progress</h2>
                    {activeOrders.length === 0 ? (
                        <Card>
                            <EmptyState
                                icon={Shirt}
                                title="No laundry in progress"
                                description="Book a pickup and we'll collect it from your door."
                                action={
                                    <Button asChild size="sm">
                                        <Link href={bookPickup()}>
                                            <CalendarPlus /> Book a pickup
                                        </Link>
                                    </Button>
                                }
                            />
                        </Card>
                    ) : (
                        activeOrders.map((order) => (
                            <Card key={order.id}>
                                <CardHeader>
                                    <CardTitle className="font-mono text-base">
                                        {order.order_number}
                                    </CardTitle>
                                    <CardDescription>
                                        {order.status === 'pending'
                                            ? 'Waiting for pickup'
                                            : `Ready by ${friendlyDateTime(order.due_at)}`}
                                    </CardDescription>
                                    <CardAction className="flex flex-wrap justify-end gap-1">
                                        {order.is_express && <ExpressBadge />}
                                        <StatusBadge status={order.status} />
                                    </CardAction>
                                </CardHeader>
                                <CardContent>
                                    <OrderStepper status={order.status} />
                                </CardContent>
                                <CardFooter className="flex-wrap justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">
                                        {order.balance > 0 ? (
                                            <>
                                                Balance to pay:{' '}
                                                <span className="font-semibold text-foreground tabular-nums">
                                                    {money(order.balance)}
                                                </span>
                                            </>
                                        ) : order.total_amount > 0 ? (
                                            'Paid in full'
                                        ) : (
                                            "We'll text you the total after weighing"
                                        )}
                                    </span>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={show(order.id)}>
                                            View details
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="text-base font-semibold">History</h2>
                    <Card className="py-0">
                        {pastOrders.data.length === 0 ? (
                            <p className="py-10 text-center text-sm text-muted-foreground">
                                Your finished orders will appear here.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden sm:table-cell">
                                            Payment
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Total
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastOrders.data.map((order) => (
                                        <TableRow
                                            key={order.id}
                                            className="cursor-pointer"
                                            onClick={() =>
                                                router.visit(show(order.id))
                                            }
                                        >
                                            <TableCell>
                                                <Link
                                                    href={show(order.id)}
                                                    className="font-mono text-xs font-medium hover:underline"
                                                >
                                                    {order.order_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {date(
                                                    order.completed_at ??
                                                        order.created_at,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={order.status}
                                                />
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <PaymentBadge
                                                    status={
                                                        order.payment_status
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {money(order.total_amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Card>

                    {pastOrders.meta.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Page {pastOrders.meta.current_page} of{' '}
                                {pastOrders.meta.last_page}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pastOrders.links.prev}
                                    onClick={() =>
                                        pastOrders.links.prev &&
                                        router.visit(pastOrders.links.prev, {
                                            preserveScroll: true,
                                        })
                                    }
                                >
                                    <ChevronLeft /> Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!pastOrders.links.next}
                                    onClick={() =>
                                        pastOrders.links.next &&
                                        router.visit(pastOrders.links.next, {
                                            preserveScroll: true,
                                        })
                                    }
                                >
                                    Next <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
