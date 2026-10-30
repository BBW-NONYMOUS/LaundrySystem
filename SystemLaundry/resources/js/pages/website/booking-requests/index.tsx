import { Head, Link, router, useForm } from '@inertiajs/react';
import { isBefore, parseISO, startOfToday } from 'date-fns';
import {
    AlertTriangle,
    CalendarCheck,
    CalendarClock,
    Check,
    MapPin,
    MoreHorizontal,
    Phone,
    Truck,
    UserCheck,
    UserPlus,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog, firstError } from '@/components/confirm-dialog';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DatePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import { ExpressBadge } from '@/components/status-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchBox } from '@/components/website/search-box';
import { StatusTabs } from '@/components/website/status-tabs';
import { countOf } from '@/components/website/types';
import type {
    BookingRequestRow,
    BookingRequestStatus,
    StatusCounts,
} from '@/components/website/types';
import { date, dateTime, number, relative } from '@/lib/format';
import { cancel, confirm, decline } from '@/routes/booking-requests';
import { show as showOrder } from '@/routes/orders';
import type { Paginated, TableFilters, UserSummary } from '@/types/models';

type Props = {
    bookings: Paginated<BookingRequestRow>;
    filters: TableFilters & { status: BookingRequestStatus };
    counts: StatusCounts;
    riders: UserSummary[];
    slots: { value: string; label: string }[];
};

const tabs: { value: BookingRequestStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'declined', label: 'Declined' },
    { value: 'cancelled', label: 'Cancelled' },
];

const emptyCopy: Record<
    BookingRequestStatus,
    { title: string; description: string }
> = {
    pending: {
        title: 'No pending requests',
        description: 'New website bookings will appear here.',
    },
    confirmed: {
        title: 'No confirmed requests yet',
        description: 'Requests you confirm become For Pickup orders.',
    },
    declined: {
        title: 'No declined requests',
        description: 'Declined requests and their reasons are kept here.',
    },
    cancelled: {
        title: 'No cancelled requests',
        description: 'Requests cancelled by phone are kept here.',
    },
};

/** Quick reasons for declining (sent to the guest by SMS). */
const declineReasons = [
    'Outside our service area',
    'Fully booked — please choose another time',
    'Couldn’t reach you by phone',
];

function isPast(day: string): boolean {
    return isBefore(parseISO(day), startOfToday());
}

/**
 * Guest pickup requests from the website (docs/public-site/04 §14.1). Confirming creates
 * the customer (or links the existing one by mobile number) and a For Pickup order.
 */
export default function BookingRequestsIndex({
    bookings,
    filters,
    counts,
    riders,
    slots,
}: Props) {
    const [confirming, setConfirming] = useState<BookingRequestRow | null>(
        null,
    );
    const [declining, setDeclining] = useState<BookingRequestRow | null>(null);
    const [cancelling, setCancelling] = useState<BookingRequestRow | null>(
        null,
    );
    const status = filters.status;
    const empty = emptyCopy[status];

    return (
        <>
            <Head title="Booking requests" />
            <PageBody>
                <PageHeader
                    title="Booking requests"
                    description="Pickup requests from the website. Confirm one to create the order and text the customer."
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <StatusTabs
                        param="status"
                        value={status}
                        label="Request status"
                        tabs={tabs.map((tab) => ({
                            ...tab,
                            count: countOf(counts, tab.value),
                        }))}
                    />
                    <SearchBox placeholder="Search name, mobile or reference" />
                </div>

                {bookings.data.length === 0 ? (
                    <Card>
                        <EmptyState
                            icon={CalendarCheck}
                            title={filters.search ? 'No matches' : empty.title}
                            description={
                                filters.search
                                    ? 'No request matches your search.'
                                    : empty.description
                            }
                        />
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {bookings.data.map((booking) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                onConfirm={() => setConfirming(booking)}
                                onDecline={() => setDeclining(booking)}
                                onCancel={() => setCancelling(booking)}
                            />
                        ))}
                    </div>
                )}

                {bookings.meta.last_page > 1 && (
                    <DataTablePagination meta={bookings.meta} />
                )}
            </PageBody>

            <ConfirmSheet
                booking={confirming}
                riders={riders}
                slots={slots}
                onClose={() => setConfirming(null)}
            />

            <DeclineDialog
                booking={declining}
                onClose={() => setDeclining(null)}
            />

            <ConfirmDialog
                open={cancelling !== null}
                onOpenChange={(open) => !open && setCancelling(null)}
                title={`Cancel ${cancelling?.reference ?? 'request'}?`}
                description="Use this when the customer called to cancel. No message is sent."
                confirmLabel="Cancel request"
                destructive
                reasonLabel="Reason"
                reasonPlaceholder="e.g. Customer called to cancel"
                onConfirm={(reason, done) => {
                    if (!cancelling) {
                        return;
                    }

                    router.post(
                        cancel.url(cancelling.id),
                        { reason },
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                done.onSuccess();
                                setCancelling(null);
                            },
                            onError: (errors) =>
                                done.onError(firstError(errors)),
                        },
                    );
                }}
            />
        </>
    );
}

/**
 * One request: who, when, where, what, and the actions for its status.
 */
function BookingCard({
    booking,
    onConfirm,
    onDecline,
    onCancel,
}: {
    booking: BookingRequestRow;
    onConfirm: () => void;
    onDecline: () => void;
    onCancel: () => void;
}) {
    const pending = booking.status === 'pending';
    const past = pending && isPast(booking.pickup_date);

    return (
        <Card className="gap-0 py-0">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:p-5">
                <div className="grid min-w-0 gap-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-sm font-medium">
                            {booking.reference}
                        </span>
                        <span className="font-semibold">{booking.name}</span>
                        <a
                            href={`tel:${booking.phone}`}
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                        >
                            <Phone className="size-3.5" aria-hidden />
                            {booking.phone}
                        </a>
                        {booking.customer ? (
                            <Badge
                                variant="outline"
                                className="border-success/30 bg-success/10 text-success"
                            >
                                <UserCheck aria-hidden />
                                Returning customer
                                {booking.customer.orders_count
                                    ? ` · ${number(booking.customer.orders_count)} orders`
                                    : ''}
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <UserPlus aria-hidden />
                                New customer
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge
                            variant={past ? 'destructive' : 'outline'}
                            className="h-6"
                        >
                            <CalendarClock aria-hidden />
                            {date(booking.pickup_date)} · {booking.time_window}
                        </Badge>
                        {past && (
                            <span className="text-xs font-medium text-destructive">
                                Date has passed — move it when confirming
                            </span>
                        )}
                        {booking.is_express && <ExpressBadge />}
                        {booking.wants_delivery && (
                            <Badge variant="secondary">
                                <Truck aria-hidden />
                                Deliver back
                            </Badge>
                        )}
                    </div>

                    <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin
                            className="mt-0.5 size-3.5 shrink-0"
                            aria-hidden
                        />
                        {booking.address}
                    </p>

                    <p className="text-sm">
                        {booking.service
                            ? booking.service.name
                            : 'Service not chosen'}
                        {booking.estimated_quantity !== null && (
                            <span className="text-muted-foreground">
                                {' '}
                                · about {number(
                                    booking.estimated_quantity,
                                )}{' '}
                                {booking.service?.unit_short ?? ''}
                            </span>
                        )}
                    </p>

                    {booking.special_instructions && (
                        <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground italic">
                            “{booking.special_instructions}”
                        </blockquote>
                    )}

                    {!pending && (
                        <p className="text-xs text-muted-foreground">
                            {booking.status_label}
                            {booking.handled_by && ` by ${booking.handled_by}`}
                            {booking.handled_at &&
                                ` · ${dateTime(booking.handled_at)}`}
                            {booking.decline_reason && (
                                <> · Reason: {booking.decline_reason}</>
                            )}
                        </p>
                    )}
                </div>

                <div className="flex flex-col items-stretch justify-between gap-3 md:items-end">
                    <span className="text-xs text-muted-foreground md:text-right">
                        Received {relative(booking.created_at)}
                    </span>

                    {pending && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 md:flex-none"
                                onClick={onDecline}
                            >
                                <X /> Decline
                            </Button>
                            <Button
                                className="flex-1 md:flex-none"
                                onClick={onConfirm}
                            >
                                <Check /> Confirm
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`More actions for ${booking.reference}`}
                                    >
                                        <MoreHorizontal />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={onCancel}
                                    >
                                        <X /> Cancel request
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}

                    {booking.order && (
                        <Button asChild variant="outline" size="sm">
                            <Link href={showOrder(booking.order.id)}>
                                Open order{' '}
                                <span className="font-mono">
                                    {booking.order.order_number}
                                </span>
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * Confirm: optionally move the date/slot and assign a rider, then create the order.
 */
function ConfirmSheet({
    booking,
    riders,
    slots,
    onClose,
}: {
    booking: BookingRequestRow | null;
    riders: UserSummary[];
    slots: { value: string; label: string }[];
    onClose: () => void;
}) {
    const form = useForm({
        pickup_date: '',
        time_slot: '',
        rider_id: '',
    });
    const [loadedFor, setLoadedFor] = useState<BookingRequestRow | null>(null);

    // Start from the requested date and slot each time the sheet opens.
    if (booking !== loadedFor) {
        setLoadedFor(booking);

        if (booking) {
            form.setData({
                pickup_date: booking.pickup_date,
                time_slot: booking.time_slot,
                rider_id: '',
            });
            form.clearErrors();
        }
    }

    const past = form.data.pickup_date !== '' && isPast(form.data.pickup_date);

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!booking) {
            return;
        }

        form.transform((data) => ({
            ...data,
            rider_id: data.rider_id === '' ? null : Number(data.rider_id),
        }));
        form.post(confirm.url(booking.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Sheet
            open={booking !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <SheetContent className="w-full gap-0 sm:max-w-md">
                <form onSubmit={submit} className="flex h-full flex-col">
                    <SheetHeader className="border-b">
                        <SheetTitle>Confirm pickup</SheetTitle>
                        <SheetDescription>
                            {booking?.reference} · {booking?.name}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="grid flex-1 content-start gap-5 overflow-y-auto p-4">
                        {booking?.customer ? (
                            <Alert className="border-success/30 bg-success/10">
                                <UserCheck className="text-success" />
                                <AlertDescription>
                                    <span>
                                        Existing customer:{' '}
                                        <strong>{booking.customer.name}</strong>
                                        {booking.customer.orders_count
                                            ? `, ${number(booking.customer.orders_count)} orders`
                                            : ''}
                                        . The order is added to their history.
                                    </span>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert>
                                <UserPlus />
                                <AlertDescription>
                                    New customer will be created for{' '}
                                    {booking?.phone}.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="confirm-date">Pickup date</Label>
                            <DatePicker
                                id="confirm-date"
                                value={form.data.pickup_date}
                                onChange={(value) =>
                                    form.setData('pickup_date', value)
                                }
                                disablePast
                            />
                            {past && !form.errors.pickup_date && (
                                <p className="flex items-center gap-1.5 text-sm text-destructive">
                                    <AlertTriangle
                                        className="size-4"
                                        aria-hidden
                                    />
                                    This date has passed. Choose a new date
                                    before confirming.
                                </p>
                            )}
                            <InputError message={form.errors.pickup_date} />
                        </div>

                        <div className="grid gap-2">
                            <Label id="confirm-slot-label">Time slot</Label>
                            <ToggleGroup
                                type="single"
                                variant="outline"
                                value={form.data.time_slot}
                                onValueChange={(value) =>
                                    value && form.setData('time_slot', value)
                                }
                                aria-labelledby="confirm-slot-label"
                                className="w-full"
                            >
                                {slots.map((slot) => (
                                    <ToggleGroupItem
                                        key={slot.value}
                                        value={slot.value}
                                        className="flex-1"
                                    >
                                        {slot.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                            <InputError message={form.errors.time_slot} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="confirm-rider">
                                Rider (optional)
                            </Label>
                            <Select
                                value={form.data.rider_id || 'none'}
                                onValueChange={(value) =>
                                    form.setData(
                                        'rider_id',
                                        value === 'none' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger id="confirm-rider">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Assign later
                                    </SelectItem>
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
                            <InputError message={form.errors.rider_id} />
                        </div>

                        <InputError
                            message={
                                (form.errors as Record<string, string>).booking
                            }
                        />

                        <p className="text-sm text-muted-foreground">
                            The customer gets an SMS with the order number and
                            tracking link.
                        </p>
                    </div>

                    <SheetFooter className="border-t sm:flex-row sm:justify-end">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Back
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || past}
                        >
                            {form.processing && <Spinner />}
                            Confirm &amp; create order
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

/**
 * Decline with a reason the guest receives by SMS. Quick reasons fill the text box.
 */
function DeclineDialog({
    booking,
    onClose,
}: {
    booking: BookingRequestRow | null;
    onClose: () => void;
}) {
    const form = useForm({ reason: '' });
    const [loadedFor, setLoadedFor] = useState<BookingRequestRow | null>(null);

    if (booking !== loadedFor) {
        setLoadedFor(booking);
        form.setData('reason', '');
        form.clearErrors();
    }

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!booking) {
            return;
        }

        form.post(decline.url(booking.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog
            open={booking !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Decline {booking?.reference}?</DialogTitle>
                        <DialogDescription>
                            {booking?.name} receives this reason by SMS.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-wrap gap-2">
                        {declineReasons.map((reason) => (
                            <Button
                                key={reason}
                                type="button"
                                variant={
                                    form.data.reason === reason
                                        ? 'secondary'
                                        : 'outline'
                                }
                                size="sm"
                                className="h-auto py-1.5 whitespace-normal"
                                onClick={() => form.setData('reason', reason)}
                            >
                                {reason}
                            </Button>
                        ))}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="decline-reason">Reason</Label>
                        <Textarea
                            id="decline-reason"
                            rows={3}
                            maxLength={255}
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                            placeholder="Tell the customer why we can't pick up"
                        />
                        <InputError message={form.errors.reason} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Back
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                form.processing ||
                                form.data.reason.trim() === ''
                            }
                        >
                            {form.processing && <Spinner />}
                            Decline &amp; notify
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
