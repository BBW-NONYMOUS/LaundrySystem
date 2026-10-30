import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import { OrderStepper } from '@/components/order-stepper';
import { Container } from '@/components/public/section';
import { ExpressBadge, StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { friendlyDateTime, money } from '@/lib/format';
import { orderStatusMessage } from '@/lib/public-site';
import { lookup } from '@/routes/public/track';
import { show as tracking } from '@/routes/tracking';
import type { StatusHistory } from '@/types/models';
import type { PublicOrder } from '@/types/public';

const finished = ['completed', 'delivered', 'cancelled'];

/** The public timeline in the shape OrderStepper expects. */
export function publicHistory(order: PublicOrder): StatusHistory[] {
    return order.timeline.map((entry, index) => ({
        id: index,
        from_status: null,
        to_status: entry.status,
        to_label: entry.label,
        changed_by: null,
        notes: null,
        created_at: entry.at,
    }));
}

/**
 * Home quick tracker: order number + mobile, checked inline. The server flashes the
 * privacy-safe `trackedOrder` back to this page (docs/public-site/04 §3.3).
 */
export function QuickTracker() {
    const { site } = usePage().props;
    const tracked = usePage().flash.trackedOrder;
    const form = useForm({ order_number: '', phone: '', inline: true });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(lookup.url(), { preserveScroll: true, preserveState: true });
    };

    return (
        <section
            id="quick-tracker"
            aria-labelledby="quick-tracker-title"
            className="relative z-10 -mt-14 scroll-mt-24 md:-mt-20"
        >
            <Container>
                <Card className="gap-0 rounded-2xl py-0 shadow-lg">
                    <CardContent className="p-5 sm:p-8">
                        <h2
                            id="quick-tracker-title"
                            className="flex items-center gap-2 text-lg font-semibold"
                        >
                            <MapPin className="size-5 text-fresh" aria-hidden />
                            Already dropped off? Check your laundry.
                        </h2>

                        <form
                            onSubmit={submit}
                            noValidate
                            className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-start"
                        >
                            <Field data-invalid={!!form.errors.order_number}>
                                <FieldLabel htmlFor="tracker-order">
                                    Order number
                                </FieldLabel>
                                <Input
                                    id="tracker-order"
                                    value={form.data.order_number}
                                    onChange={(event) =>
                                        form.setData(
                                            'order_number',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="LND-20261023-0012"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    className="h-11 font-mono text-base uppercase placeholder:normal-case"
                                    aria-invalid={!!form.errors.order_number}
                                    aria-describedby="tracker-help tracker-order-error"
                                />
                                <FieldError id="tracker-order-error">
                                    {form.errors.order_number}
                                </FieldError>
                            </Field>

                            <Field data-invalid={!!form.errors.phone}>
                                <FieldLabel htmlFor="tracker-phone">
                                    Mobile number
                                </FieldLabel>
                                <Input
                                    id="tracker-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={form.data.phone}
                                    onChange={(event) =>
                                        form.setData(
                                            'phone',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="0917 123 4567"
                                    className="h-11 text-base"
                                    aria-invalid={!!form.errors.phone}
                                    aria-describedby="tracker-phone-error"
                                />
                                <FieldError id="tracker-phone-error">
                                    {form.errors.phone}
                                </FieldError>
                            </Field>

                            <Button
                                type="submit"
                                className="h-11 px-6 text-base md:mt-[1.625rem]"
                                disabled={form.processing}
                            >
                                {form.processing && <Spinner />}
                                Check Status
                            </Button>
                        </form>

                        <p
                            id="tracker-help"
                            className="mt-3 text-sm text-muted-foreground"
                        >
                            Your order number is on your receipt and in our SMS.
                        </p>

                        <div aria-live="polite">
                            {tracked && (
                                <TrackedOrderResult
                                    order={tracked}
                                    site={site}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </Container>
        </section>
    );
}

function TrackedOrderResult({
    order,
    site,
}: {
    order: PublicOrder;
    site: {
        name: string | null;
        phone: string | null;
        hours: string | null;
        currency_symbol: string | null;
    };
}) {
    const done = finished.includes(order.status);
    const pickup =
        order.status === 'pending' && order.pickup_scheduled_at
            ? friendlyDateTime(order.pickup_scheduled_at)
            : null;

    return (
        <div className="mt-6">
            <Separator className="mb-6" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="font-mono text-sm text-muted-foreground">
                        {order.order_number}
                    </p>
                    <p className="text-lg font-semibold">
                        Hi, {order.customer_first_name}!
                    </p>
                    <p className="text-muted-foreground">
                        {orderStatusMessage(order.status, site, pickup)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <StatusBadge status={order.status} size="lg" />
                    {order.is_express && <ExpressBadge />}
                </div>
            </div>

            <OrderStepper
                className="mt-6"
                status={order.status}
                history={publicHistory(order)}
                hasDelivery={order.delivery_scheduled_at !== null}
            />

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:flex sm:flex-wrap">
                    {!done && order.due_at && (
                        <div>
                            <dt className="text-muted-foreground">Ready by</dt>
                            <dd className="font-medium">
                                {friendlyDateTime(order.due_at)}
                            </dd>
                        </div>
                    )}
                    {order.status === 'pending' &&
                        order.pickup_scheduled_at && (
                            <div>
                                <dt className="text-muted-foreground">
                                    Pickup
                                </dt>
                                <dd className="font-medium">
                                    {friendlyDateTime(
                                        order.pickup_scheduled_at,
                                    )}
                                </dd>
                            </div>
                        )}
                    {order.delivery_scheduled_at && (
                        <div>
                            <dt className="text-muted-foreground">Delivery</dt>
                            <dd className="font-medium">
                                {friendlyDateTime(order.delivery_scheduled_at)}
                            </dd>
                        </div>
                    )}
                    {order.total_amount > 0 && (
                        <div>
                            <dt className="text-muted-foreground">
                                Balance due
                            </dt>
                            <dd
                                className={
                                    order.balance > 0
                                        ? 'font-semibold tabular-nums'
                                        : 'font-medium text-success'
                                }
                            >
                                {order.balance > 0
                                    ? money(
                                          order.balance,
                                          site.currency_symbol ?? '₱',
                                      )
                                    : 'Fully paid'}
                            </dd>
                        </div>
                    )}
                </dl>
                <Button asChild variant="link" className="h-auto px-0">
                    <Link href={tracking(order.tracking_code)}>
                        View full details
                        <ArrowRight aria-hidden />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
