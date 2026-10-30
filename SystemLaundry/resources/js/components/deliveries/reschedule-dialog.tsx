import { useForm } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { update } from '@/routes/deliveries';
import type { Delivery } from '@/types/models';

/** Delivery slots offered to customers (same as the demo data and the design spec). */
export const TIME_SLOTS = [
    { value: '09:00', label: '9 AM' },
    { value: '13:00', label: '1 PM' },
    { value: '16:00', label: '4 PM' },
];

/**
 * Move a trip to another day/slot or fix the address. A failed trip becomes Scheduled again.
 */
export function RescheduleDialog({
    trip,
    open,
    onOpenChange,
}: {
    trip: Delivery;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const scheduled = parseISO(trip.scheduled_at);
    const currentSlot = format(scheduled, 'HH:mm');
    const form = useForm({
        date: format(scheduled, 'yyyy-MM-dd'),
        slot: TIME_SLOTS.some((slot) => slot.value === currentSlot)
            ? currentSlot
            : '09:00',
        address: trip.address,
    });

    // Laravel expects one "scheduled_at" field: "yyyy-MM-dd HH:mm:00".
    form.transform((data) => ({
        scheduled_at: `${data.date} ${data.slot}:00`,
        address: data.address,
    }));

    // The server validates the transformed field, so its error comes back as "scheduled_at".
    const errors = form.errors as Partial<
        Record<'scheduled_at' | 'address', string>
    >;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(update.url(trip.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            Reschedule {trip.type_label.toLowerCase()}
                        </DialogTitle>
                        <DialogDescription>
                            Order{' '}
                            <span className="font-mono">
                                {trip.order?.order_number}
                            </span>
                            {trip.order?.customer_name &&
                                ` · ${trip.order.customer_name}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="reschedule-date">Date</Label>
                        <DatePicker
                            id="reschedule-date"
                            value={form.data.date}
                            onChange={(value) => form.setData('date', value)}
                            disablePast
                        />
                        <InputError message={errors.scheduled_at} />
                    </div>

                    <div className="grid gap-2">
                        <Label>Time slot</Label>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={form.data.slot}
                            onValueChange={(value) =>
                                value && form.setData('slot', value)
                            }
                            className="w-full"
                        >
                            {TIME_SLOTS.map((slot) => (
                                <ToggleGroupItem
                                    key={slot.value}
                                    value={slot.value}
                                    className="flex-1"
                                >
                                    {slot.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="reschedule-address">Address</Label>
                        <Textarea
                            id="reschedule-address"
                            value={form.data.address}
                            onChange={(event) =>
                                form.setData('address', event.target.value)
                            }
                            rows={2}
                        />
                        <InputError message={errors.address} />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Save schedule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
