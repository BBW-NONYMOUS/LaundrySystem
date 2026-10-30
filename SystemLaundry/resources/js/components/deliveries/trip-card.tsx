import { Link, router } from '@inertiajs/react';
import {
    CalendarClock,
    MapPin,
    Phone,
    RotateCcw,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { RescheduleDialog } from '@/components/deliveries/reschedule-dialog';
import { DeliveryStatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { friendlyDateTime, money, time } from '@/lib/format';
import { cn } from '@/lib/utils';
import { update } from '@/routes/deliveries';
import { show as showOrder } from '@/routes/orders';
import type { Delivery, UserSummary } from '@/types/models';

/**
 * One pickup/delivery trip with rider assignment and rescheduling.
 * Finished trips (completed/cancelled) are read-only.
 */
export function TripCard({
    trip,
    riders,
    showDate = false,
}: {
    trip: Delivery;
    riders: UserSummary[];
    /** Show the full date instead of only the time (for trips from other days). */
    showDate?: boolean;
}) {
    const [rescheduling, setRescheduling] = useState(false);
    const closed = trip.status === 'completed' || trip.status === 'cancelled';
    const canReschedule =
        trip.status === 'scheduled' || trip.status === 'failed';

    // Assigning saves immediately; the board reloads with the trip under its rider.
    const assign = (riderId: string) =>
        router.put(
            update.url(trip.id),
            { rider_id: Number(riderId) },
            { preserveScroll: true },
        );

    return (
        <div
            className={cn(
                'grid gap-2 rounded-lg border bg-card p-3',
                trip.status === 'failed' && 'border-destructive/40',
            )}
        >
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                    {showDate
                        ? friendlyDateTime(trip.scheduled_at)
                        : time(trip.scheduled_at)}
                </span>
                <Badge
                    variant={trip.type === 'pickup' ? 'secondary' : 'outline'}
                >
                    {trip.type_label}
                </Badge>
                <DeliveryStatusBadge
                    status={trip.status}
                    label={trip.status_label}
                />
                {trip.attempts > 1 && (
                    <span className="text-xs text-muted-foreground">
                        Attempt {trip.attempts}
                    </span>
                )}
                {trip.order && (
                    <Link
                        href={showOrder(trip.order.id)}
                        className="ml-auto font-mono text-xs font-medium hover:underline"
                    >
                        {trip.order.order_number}
                    </Link>
                )}
            </div>

            <div className="grid gap-1 text-sm">
                <span className="font-medium">
                    {trip.order?.customer_name ?? 'Customer'}
                </span>
                <span className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {trip.address || 'No address'}
                </span>
                <a
                    href={`tel:${trip.contact_phone}`}
                    className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                    <Phone className="size-3.5" />
                    {trip.contact_phone}
                </a>
                {trip.type === 'delivery' &&
                    trip.order &&
                    trip.order.balance > 0 &&
                    !closed && (
                        <span className="text-xs font-medium text-destructive">
                            Collect {money(trip.order.balance)} on delivery
                        </span>
                    )}
                {trip.failure_reason && (
                    <span className="flex items-center gap-1.5 text-xs text-destructive">
                        <TriangleAlert className="size-3.5" />
                        {trip.failure_reason}
                    </span>
                )}
            </div>

            {!closed && (
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={trip.rider ? String(trip.rider.id) : undefined}
                        onValueChange={assign}
                    >
                        <SelectTrigger
                            size="sm"
                            className="h-8 min-w-40 flex-1"
                            aria-label="Assign rider"
                        >
                            <SelectValue placeholder="Assign rider…" />
                        </SelectTrigger>
                        <SelectContent>
                            {riders.map((rider) => (
                                <SelectItem
                                    key={rider.id}
                                    value={String(rider.id)}
                                >
                                    {rider.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {canReschedule && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRescheduling(true)}
                        >
                            {trip.status === 'failed' ? (
                                <RotateCcw />
                            ) : (
                                <CalendarClock />
                            )}
                            Reschedule
                        </Button>
                    )}
                </div>
            )}

            {rescheduling && (
                <RescheduleDialog
                    trip={trip}
                    open={rescheduling}
                    onOpenChange={setRescheduling}
                />
            )}
        </div>
    );
}
