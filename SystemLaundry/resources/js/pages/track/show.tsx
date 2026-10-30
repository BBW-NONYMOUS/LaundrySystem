import { Link, usePage, usePoll } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import {
    ArrowRight,
    CalendarClock,
    MessageCircle,
    Phone,
    Star,
    Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { OrderStepper } from '@/components/order-stepper';
import { Container } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { ExpressBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { dateTime, friendlyDateTime, money, quantity } from '@/lib/format';
import { displayPhone, orderStatusMessage, telHref } from '@/lib/public-site';
import { feedback } from '@/routes/public';
import type { StatusHistory } from '@/types/models';
import type { PublicOrder, Seo } from '@/types/public';

type Props = {
    order: PublicOrder;
    seo: Seo;
};

const FINISHED = ['completed', 'delivered', 'cancelled'];

/**
 * Order status page from the SMS/receipt link or the Track form (docs/public-site/04 §5.2).
 * Shows only the first name: no address, staff names or payment details.
 */
export default function TrackingShow({ order, seo }: Props) {
    const { site } = usePage().props;
    const symbol = site.currency_symbol ?? '₱';
    const finished = FINISHED.includes(order.status);

    // Customers often leave this open; refresh every minute until the order is done.
    usePoll(60_000, {}, { autoStart: !finished });

    const history: StatusHistory[] = order.timeline.map((entry, index) => ({
        id: index,
        from_status: null,
        to_status: entry.status,
        to_label: entry.label,
        changed_by: null,
        notes: null,
        created_at: entry.at,
    }));
    const pickup = order.pickup_scheduled_at
        ? format(parseISO(order.pickup_scheduled_at), "EEEE, MMM d 'at' h:mm a")
        : null;
    const rateable =
        order.status === 'completed' || order.status === 'delivered';

    return (
        <>
            <SeoHead seo={seo} />
            <div className="bg-linear-to-b from-fresh-soft to-background">
                <Container className="max-w-3xl py-10 md:py-16">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader className="gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="font-mono text-sm text-muted-foreground">
                                    {order.order_number}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {order.is_express && <ExpressBadge />}
                                    <StatusBadge
                                        status={order.status}
                                        size="lg"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                                    Hi, {order.customer_first_name}!
                                </h1>
                                <p
                                    className="text-lg text-muted-foreground"
                                    aria-live="polite"
                                >
                                    {orderStatusMessage(
                                        order.status,
                                        site,
                                        pickup,
                                    )}
                                </p>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-6">
                            <OrderStepper
                                status={order.status}
                                history={history}
                                hasDelivery={
                                    order.delivery_scheduled_at !== null
                                }
                            />

                            <Separator />

                            <div className="grid gap-6 sm:grid-cols-2">
                                <dl className="grid gap-3 text-base">
                                    <Detail label="Received">
                                        {order.received_at
                                            ? dateTime(order.received_at)
                                            : 'Waiting for pickup'}
                                    </Detail>
                                    {!finished && order.due_at && (
                                        <Detail label="Ready by">
                                            {friendlyDateTime(order.due_at)}
                                        </Detail>
                                    )}
                                    {order.status === 'pending' &&
                                        order.pickup_scheduled_at && (
                                            <Detail
                                                label="Pickup"
                                                icon={CalendarClock}
                                            >
                                                {friendlyDateTime(
                                                    order.pickup_scheduled_at,
                                                )}
                                            </Detail>
                                        )}
                                    {order.delivery_scheduled_at && (
                                        <Detail label="Delivery" icon={Truck}>
                                            {friendlyDateTime(
                                                order.delivery_scheduled_at,
                                            )}
                                        </Detail>
                                    )}
                                </dl>

                                {order.total_amount > 0 && (
                                    <dl className="grid h-fit gap-3 rounded-xl bg-muted/50 p-4 text-base">
                                        <Detail label="Total">
                                            <span className="tabular-nums">
                                                {money(
                                                    order.total_amount,
                                                    symbol,
                                                )}
                                            </span>
                                        </Detail>
                                        <Detail label="Balance due">
                                            {order.balance > 0 ? (
                                                <span className="font-semibold text-destructive tabular-nums">
                                                    {money(
                                                        order.balance,
                                                        symbol,
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="font-semibold text-success">
                                                    Fully paid
                                                </span>
                                            )}
                                        </Detail>
                                        {order.balance > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                Pay with cash, GCash or Maya.
                                            </p>
                                        )}
                                    </dl>
                                )}
                            </div>

                            {order.items.length > 0 && (
                                <div className="grid gap-2">
                                    <h2 className="text-sm font-semibold">
                                        Items
                                    </h2>
                                    <ul className="grid gap-1 text-base">
                                        {order.items.map((item, index) => (
                                            <li
                                                key={index}
                                                className="flex justify-between gap-4"
                                            >
                                                <span>{item.service_name}</span>
                                                <span className="text-muted-foreground tabular-nums">
                                                    {quantity(
                                                        item.quantity,
                                                        item.unit,
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {order.timeline.length > 0 && (
                                <div className="grid gap-2">
                                    <h2 className="text-sm font-semibold">
                                        History
                                    </h2>
                                    <ol className="grid gap-1 text-sm text-muted-foreground">
                                        {[...order.timeline]
                                            .reverse()
                                            .map((entry, index) => (
                                                <li
                                                    key={index}
                                                    className="flex justify-between gap-4"
                                                >
                                                    <span className="text-foreground">
                                                        {entry.label}
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {dateTime(entry.at)}
                                                    </span>
                                                </li>
                                            ))}
                                    </ol>
                                </div>
                            )}

                            {rateable && (
                                <div className="flex flex-col items-start gap-3 rounded-xl border border-fresh/30 bg-fresh-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="flex items-center gap-2 font-medium">
                                        <Star
                                            className="size-5 fill-current text-fresh"
                                            aria-hidden
                                        />
                                        How did we do?
                                    </p>
                                    <Button
                                        asChild
                                        variant="link"
                                        className="px-0"
                                    >
                                        <Link
                                            href={feedback(order.tracking_code)}
                                        >
                                            Rate your laundry
                                            <ArrowRight aria-hidden />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col items-start gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Questions about this order?
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {site.phone && (
                                    <Button asChild variant="outline">
                                        <a href={telHref(site.phone)}>
                                            <Phone aria-hidden />
                                            Call {displayPhone(site.phone)}
                                        </a>
                                    </Button>
                                )}
                                {site.messenger_url && (
                                    <Button asChild variant="outline">
                                        <a
                                            href={site.messenger_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <MessageCircle aria-hidden />
                                            Messenger
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                </Container>
            </div>
        </>
    );
}

function Detail({
    label,
    icon: Icon,
    children,
}: {
    label: string;
    icon?: LucideIcon;
    children: ReactNode;
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 sm:block">
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {Icon && <Icon className="size-3.5" aria-hidden />}
                {label}
            </dt>
            <dd className="font-medium">{children}</dd>
        </div>
    );
}
