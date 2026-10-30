import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { fail } from '@/routes/rider/deliveries';
import type { Delivery } from '@/types/models';

const reasons = [
    'Not home',
    'Wrong address',
    'Refused',
    'Rescheduled by customer',
];

/**
 * Failed trip: one tap on a common reason, or type one. The counter reschedules it.
 */
export function FailTripDrawer({
    trip,
    open,
    onOpenChange,
}: {
    trip: Delivery;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({ reason: '' });

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
        }
        // Reset only when the drawer closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(fail.url(trip.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <form onSubmit={submit} className="mx-auto w-full max-w-md">
                    <DrawerHeader>
                        <DrawerTitle>
                            Why couldn't you finish this trip?
                        </DrawerTitle>
                        <DrawerDescription>
                            {trip.order?.order_number} ·{' '}
                            {trip.order?.customer_name}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="grid gap-4 px-4">
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={
                                reasons.includes(form.data.reason)
                                    ? form.data.reason
                                    : ''
                            }
                            onValueChange={(value) =>
                                value && form.setData('reason', value)
                            }
                            className="grid w-full grid-cols-2"
                        >
                            {reasons.map((reason) => (
                                <ToggleGroupItem
                                    key={reason}
                                    value={reason}
                                    className="h-12 rounded-md! border!"
                                >
                                    {reason}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>

                        <div className="grid gap-2">
                            <Label htmlFor="fail-reason">Reason</Label>
                            <Textarea
                                id="fail-reason"
                                value={form.data.reason}
                                onChange={(event) =>
                                    form.setData('reason', event.target.value)
                                }
                                placeholder="Tap a reason above or type one"
                                rows={2}
                            />
                            <InputError
                                message={
                                    form.errors.reason ??
                                    (
                                        form.errors as Record<
                                            string,
                                            string | undefined
                                        >
                                    ).delivery
                                }
                            />
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button
                            type="submit"
                            variant="destructive"
                            size="lg"
                            className="h-12 text-base"
                            disabled={
                                form.processing ||
                                form.data.reason.trim() === ''
                            }
                        >
                            {form.processing && <Spinner />}
                            Mark as failed
                        </Button>
                        <DrawerClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="h-12"
                            >
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    );
}
