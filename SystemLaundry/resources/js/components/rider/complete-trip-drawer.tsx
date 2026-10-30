import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { PaymentFields } from '@/components/payment-fields';
import type { PaymentValues } from '@/components/payment-fields';
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
import { Spinner } from '@/components/ui/spinner';
import { money } from '@/lib/format';
import { complete } from '@/routes/rider/deliveries';
import type { Delivery, PaymentMethodOption } from '@/types/models';

/**
 * "Done" for a trip. Deliveries with a balance collect cash-on-delivery in the same step
 * (the server records the payment and completes the trip in one transaction).
 */
export function CompleteTripDrawer({
    trip,
    open,
    onOpenChange,
    methods,
}: {
    trip: Delivery;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    methods: PaymentMethodOption[];
}) {
    const balance = trip.order?.balance ?? 0;
    const collect = trip.type === 'delivery' && balance > 0;
    const form = useForm({
        payment_method: 'cash' as PaymentValues['method'],
        amount_tendered: '',
        reference_number: '',
    });

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
        }
        // Reset only when the drawer closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const values: PaymentValues = {
        method: form.data.payment_method,
        amount: balance.toFixed(2),
        amount_tendered: form.data.amount_tendered,
        reference_number: form.data.reference_number,
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) =>
            collect
                ? {
                      collected_amount: balance.toFixed(2),
                      payment_method: data.payment_method,
                      amount_tendered:
                          data.payment_method === 'cash'
                              ? data.amount_tendered || balance.toFixed(2)
                              : '',
                      reference_number:
                          data.payment_method === 'cash'
                              ? ''
                              : data.reference_number,
                  }
                : {},
        );
        form.post(complete.url(trip.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    const isPickup = trip.type === 'pickup';

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <form onSubmit={submit} className="mx-auto w-full max-w-md">
                    <DrawerHeader>
                        <DrawerTitle>
                            {isPickup
                                ? 'Laundry picked up?'
                                : 'Laundry delivered?'}
                        </DrawerTitle>
                        <DrawerDescription>
                            {trip.order?.order_number} ·{' '}
                            {trip.order?.customer_name}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="grid gap-4 overflow-y-auto px-4">
                        {collect ? (
                            <>
                                <div className="flex items-baseline justify-between rounded-lg bg-destructive/10 px-4 py-3">
                                    <span className="text-sm font-medium text-destructive">
                                        Collect
                                    </span>
                                    <span className="text-3xl font-semibold text-destructive tabular-nums">
                                        {money(balance)}
                                    </span>
                                </div>
                                <PaymentFields
                                    values={values}
                                    onChange={(next) =>
                                        form.setData({
                                            payment_method: next.method,
                                            amount_tendered:
                                                next.amount_tendered,
                                            reference_number:
                                                next.reference_number,
                                        })
                                    }
                                    methods={methods}
                                    balance={balance}
                                    hideAmount
                                    errors={{
                                        method: form.errors.payment_method,
                                        amount_tendered:
                                            form.errors.amount_tendered,
                                        reference_number:
                                            form.errors.reference_number,
                                        amount: (
                                            form.errors as Record<
                                                string,
                                                string | undefined
                                            >
                                        ).collected_amount,
                                    }}
                                />
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {isPickup
                                    ? 'Bring the bag to the shop; the counter will weigh it.'
                                    : 'Nothing to collect — this order is fully paid.'}
                            </p>
                        )}
                        {/* Server-side rule errors (e.g. "Start the trip first") come back on these keys. */}
                        <InputError
                            message={
                                (
                                    form.errors as Record<
                                        string,
                                        string | undefined
                                    >
                                ).delivery ??
                                (
                                    form.errors as Record<
                                        string,
                                        string | undefined
                                    >
                                ).status
                            }
                        />
                    </div>

                    <DrawerFooter>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 text-base"
                            disabled={form.processing}
                        >
                            {form.processing && <Spinner />}
                            {collect
                                ? `Collected ${money(balance)} · Done`
                                : 'Confirm'}
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
