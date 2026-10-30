import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    MapPin,
    Navigation,
    Phone,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { DeliveryStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
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
import { Spinner } from '@/components/ui/spinner';
import { friendlyDateTime, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { start } from '@/routes/rider/deliveries';
import type { Delivery, PaymentMethodOption } from '@/types/models';
import { CompleteTripDrawer } from './complete-trip-drawer';
import { FailTripDrawer } from './fail-trip-drawer';

/**
 * One pickup/delivery on the rider's phone: when, who, where, how much, and the next action.
 */
export function TripCard({
    trip,
    methods,
    onDrawerChange,
}: {
    trip: Delivery;
    methods: PaymentMethodOption[];
    /** Lets the page pause auto-refresh while a drawer is open. */
    onDrawerChange?: (open: boolean) => void;
}) {
    const [drawer, setDrawer] = useState<'complete' | 'fail' | null>(null);
    const [starting, setStarting] = useState(false);
    const balance = trip.order?.balance ?? 0;
    const collect = trip.type === 'delivery' && balance > 0;
    const finished = trip.status === 'completed' || trip.status === 'failed';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.address)}`;

    const openDrawer = (value: 'complete' | 'fail' | null) => {
        setDrawer(value);
        onDrawerChange?.(value !== null);
    };

    const startTrip = () => {
        router.post(
            start.url(trip.id),
            {},
            {
                preserveScroll: true,
                onStart: () => setStarting(true),
                onFinish: () => setStarting(false),
            },
        );
    };

    return (
        <Card
            className={cn(
                'gap-4',
                trip.status === 'in_transit' &&
                    'border-status-out-for-delivery/50 ring-2 ring-status-out-for-delivery/15',
            )}
        >
            <CardHeader>
                <CardDescription className="flex items-center gap-1.5 font-medium text-foreground">
                    <Clock className="size-4" />
                    {friendlyDateTime(trip.scheduled_at)}
                </CardDescription>
                <CardTitle className="text-lg">
                    {trip.order?.customer_name}
                </CardTitle>
                <CardAction className="flex flex-col items-end gap-1">
                    <Badge
                        variant={
                            trip.type === 'pickup' ? 'secondary' : 'default'
                        }
                    >
                        {trip.type_label}
                    </Badge>
                    {trip.status !== 'scheduled' && (
                        <DeliveryStatusBadge
                            status={trip.status}
                            label={trip.status_label}
                        />
                    )}
                </CardAction>
            </CardHeader>

            <CardContent className="grid gap-3">
                <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm hover:underline"
                >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{trip.address}</span>
                </a>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">
                        {trip.order?.order_number}
                    </span>
                    {trip.order?.items_summary && (
                        <span>{trip.order.items_summary}</span>
                    )}
                    {trip.attempts > 0 && trip.status === 'scheduled' && (
                        <span className="text-warning">
                            Attempt #{trip.attempts + 1}
                        </span>
                    )}
                </div>

                {trip.failure_reason && (
                    <p className="text-sm text-destructive">
                        Last attempt: {trip.failure_reason}
                    </p>
                )}
                {trip.notes && <p className="text-sm">Note: {trip.notes}</p>}

                {collect && !finished && (
                    <div className="flex items-baseline justify-between rounded-lg bg-destructive/10 px-3 py-2">
                        <span className="text-sm font-medium text-destructive">
                            To collect
                        </span>
                        <span className="text-2xl font-semibold text-destructive tabular-nums">
                            {money(balance)}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-12"
                        asChild
                    >
                        <a href={`tel:${trip.contact_phone}`}>
                            <Phone /> Call
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-12"
                        asChild
                    >
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Navigation /> Maps
                        </a>
                    </Button>
                </div>
            </CardContent>

            {!finished && (
                <CardFooter className="grid gap-2">
                    {trip.status === 'scheduled' ? (
                        <Button
                            size="lg"
                            className="h-14 text-base"
                            onClick={startTrip}
                            disabled={starting}
                        >
                            {starting && <Spinner />}
                            Start{' '}
                            {trip.type === 'pickup' ? 'pickup' : 'delivery'}
                        </Button>
                    ) : (
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <Button
                                size="lg"
                                className="h-14 bg-success text-base text-white hover:bg-success/90 dark:text-neutral-950"
                                onClick={() => openDrawer('complete')}
                            >
                                <CheckCircle2 />
                                {trip.type === 'pickup'
                                    ? 'Picked up'
                                    : 'Delivered'}
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="h-14 border-destructive/40 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => openDrawer('fail')}
                            >
                                <XCircle />
                                Failed
                            </Button>
                        </div>
                    )}
                </CardFooter>
            )}

            <CompleteTripDrawer
                trip={trip}
                methods={methods}
                open={drawer === 'complete'}
                onOpenChange={(open) => openDrawer(open ? 'complete' : null)}
            />
            <FailTripDrawer
                trip={trip}
                open={drawer === 'fail'}
                onOpenChange={(open) => openDrawer(open ? 'fail' : null)}
            />
        </Card>
    );
}
