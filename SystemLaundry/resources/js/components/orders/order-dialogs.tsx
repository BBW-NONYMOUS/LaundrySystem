import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { PaymentFields } from '@/components/payment-fields';
import type { PaymentValues } from '@/components/payment-fields';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { isoDate, money, quantity } from '@/lib/format';
import { update } from '@/routes/orders';
import { store as storeTrip } from '@/routes/orders/deliveries';
import { store as storePayment } from '@/routes/orders/payments';
import type {
    DeliveryType,
    Order,
    PaymentMethodOption,
    Service,
    UserSummary,
} from '@/types/models';

/** Delivery time slots offered to customers (docs/04 §1.5). */
export const TIME_SLOTS = [
    { value: '09:00', label: '9 AM' },
    { value: '13:00', label: '1 PM' },
    { value: '16:00', label: '4 PM' },
];

/**
 * Record payment for an order (walk-in or e-wallet). Change is computed by PaymentFields.
 */
export function RecordPaymentDialog({
    order,
    methods,
    open,
    onOpenChange,
}: {
    order: Order;
    methods: PaymentMethodOption[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm<PaymentValues & { notes: string }>({
        method: 'cash',
        amount: order.balance.toFixed(2),
        amount_tendered: '',
        reference_number: '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            form.setData('amount', order.balance.toFixed(2));
        }
        // Reset the default amount each time the dialog opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, order.balance]);

    const submit = () => {
        form.post(storePayment.url(order.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record payment</DialogTitle>
                    <DialogDescription>
                        {order.order_number} · Balance{' '}
                        <span className="font-medium text-foreground">
                            {money(order.balance)}
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                    className="grid gap-4"
                >
                    <PaymentFields
                        values={form.data}
                        onChange={(values) =>
                            form.setData({ ...form.data, ...values })
                        }
                        methods={methods}
                        balance={order.balance}
                        errors={form.errors}
                    />
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
                            Save payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Schedule (or reschedule) a pickup or delivery trip and optionally assign a rider.
 */
export function ScheduleTripDialog({
    order,
    riders,
    open,
    onOpenChange,
}: {
    order: Order;
    riders: UserSummary[] | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const existing = order.deliveries?.find((trip) => trip.type === 'delivery');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const form = useForm({
        type: (order.status === 'pending'
            ? 'pickup'
            : 'delivery') as DeliveryType,
        date: isoDate(tomorrow),
        slot: '13:00',
        address: existing?.address ?? order.customer?.address ?? '',
        contact_phone: existing?.contact_phone ?? order.customer?.phone ?? '',
        rider_id: existing?.rider?.id ? String(existing.rider.id) : '',
        notes: '',
    });

    useEffect(() => {
        // Riders are an optional prop: only fetched when this dialog is opened.
        if (open && riders === undefined) {
            router.reload({ only: ['riders'] });
        }
    }, [open, riders]);

    const submit = () => {
        form.transform((data) => ({
            type: data.type,
            scheduled_at: `${data.date} ${data.slot}:00`,
            address: data.address,
            contact_phone: data.contact_phone,
            rider_id: data.rider_id === '' ? null : Number(data.rider_id),
            notes: data.notes || null,
        }));
        form.post(storeTrip.url(order.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Schedule pickup or delivery</DialogTitle>
                    <DialogDescription>
                        A new trip adds the delivery fee to the order.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit();
                    }}
                    className="grid gap-4"
                >
                    <div className="grid gap-2">
                        <Label>Trip</Label>
                        <RadioGroup
                            value={form.data.type}
                            onValueChange={(value) =>
                                form.setData('type', value as DeliveryType)
                            }
                            className="flex gap-6"
                        >
                            <label className="flex items-center gap-2 text-sm">
                                <RadioGroupItem
                                    value="pickup"
                                    disabled={order.status !== 'pending'}
                                />
                                Pickup from customer
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <RadioGroupItem value="delivery" />
                                Delivery to customer
                            </label>
                        </RadioGroup>
                        <InputError message={form.errors.type} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="trip-date">Date</Label>
                            <DatePicker
                                id="trip-date"
                                value={form.data.date}
                                onChange={(value) =>
                                    form.setData('date', value)
                                }
                                disablePast
                            />
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
                    </div>
                    <InputError
                        message={
                            (form.errors as Record<string, string>).scheduled_at
                        }
                    />

                    <div className="grid gap-2">
                        <Label htmlFor="trip-address">Address</Label>
                        <Textarea
                            id="trip-address"
                            rows={2}
                            value={form.data.address}
                            onChange={(event) =>
                                form.setData('address', event.target.value)
                            }
                        />
                        <InputError message={form.errors.address} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="trip-phone">Contact mobile</Label>
                            <Input
                                id="trip-phone"
                                type="tel"
                                value={form.data.contact_phone}
                                onChange={(event) =>
                                    form.setData(
                                        'contact_phone',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.contact_phone} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="trip-rider">Rider</Label>
                            {riders === undefined ? (
                                <Skeleton className="h-9 w-full" />
                            ) : (
                                <Select
                                    value={form.data.rider_id || 'none'}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'rider_id',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="trip-rider"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Assign later" />
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
                            )}
                            <InputError message={form.errors.rider_id} />
                        </div>
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

type ItemRow = {
    service_id: string;
    quantity: string;
    piece_count: string;
};

/**
 * Edit items before washing starts (e.g. weigh a picked-up booking).
 * Totals are recomputed by the server; the preview here uses the same formula.
 */
export function EditItemsSheet({
    order,
    services,
    expressPercent,
    open,
    onOpenChange,
}: {
    order: Order;
    services: Service[] | undefined;
    expressPercent: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        items: (order.items ?? []).map<ItemRow>((item) => ({
            service_id: String(item.service_id),
            quantity: String(item.quantity),
            piece_count:
                item.piece_count === null ? '' : String(item.piece_count),
        })),
        is_express: order.is_express,
        discount_amount: order.discount_amount
            ? String(order.discount_amount)
            : '',
        discount_reason: order.discount_reason ?? '',
        special_instructions: order.special_instructions ?? '',
    });

    useEffect(() => {
        if (open && services === undefined) {
            router.reload({ only: ['services'] });
        }
    }, [open, services]);

    const serviceFor = (id: string) =>
        services?.find((service) => String(service.id) === id);

    const lineTotal = (row: ItemRow) => {
        const service = serviceFor(row.service_id);

        return service
            ? Math.max(Number(row.quantity || 0), service.min_quantity) *
                  service.price
            : 0;
    };

    const subtotal = form.data.items.reduce(
        (sum, row) => sum + lineTotal(row),
        0,
    );
    const expressFee = form.data.is_express
        ? (subtotal * expressPercent) / 100
        : 0;
    const total = Math.max(
        subtotal +
            expressFee +
            order.delivery_fee -
            Number(form.data.discount_amount || 0),
        0,
    );

    const setRow = (index: number, patch: Partial<ItemRow>) =>
        form.setData(
            'items',
            form.data.items.map((row, i) =>
                i === index ? { ...row, ...patch } : row,
            ),
        );

    const errors = form.errors as Record<string, string>;

    const submit = () => {
        form.transform((data) => ({
            items: data.items
                .filter((row) => row.service_id !== '')
                .map((row) => ({
                    service_id: Number(row.service_id),
                    quantity: Number(row.quantity),
                    piece_count:
                        row.piece_count === '' ? null : Number(row.piece_count),
                })),
            is_express: data.is_express,
            discount_amount:
                data.discount_amount === '' ? 0 : Number(data.discount_amount),
            discount_reason: data.discount_reason || null,
            special_instructions: data.special_instructions || null,
        }));
        form.put(update.url(order.id), {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>Edit items · {order.order_number}</SheetTitle>
                    <SheetDescription>
                        Only possible before washing starts.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
                    {services === undefined ? (
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {form.data.items.map((row, index) => {
                                const service = serviceFor(row.service_id);

                                return (
                                    <div
                                        key={index}
                                        className="grid gap-2 rounded-lg border p-3"
                                    >
                                        <div className="flex gap-2">
                                            <Select
                                                value={row.service_id}
                                                onValueChange={(value) =>
                                                    setRow(index, {
                                                        service_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger
                                                    className="flex-1"
                                                    aria-label="Service"
                                                >
                                                    <SelectValue placeholder="Choose a service" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {services.map((option) => (
                                                        <SelectItem
                                                            key={option.id}
                                                            value={String(
                                                                option.id,
                                                            )}
                                                        >
                                                            {option.name} ·{' '}
                                                            {money(
                                                                option.price,
                                                            )}
                                                            /{option.unit_short}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Remove item"
                                                onClick={() =>
                                                    form.setData(
                                                        'items',
                                                        form.data.items.filter(
                                                            (_, i) =>
                                                                i !== index,
                                                        ),
                                                    )
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="grid gap-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    Qty (
                                                    {service?.unit_short ??
                                                        'kg'}
                                                    )
                                                </Label>
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.1"
                                                    min="0"
                                                    value={row.quantity}
                                                    onChange={(event) =>
                                                        setRow(index, {
                                                            quantity:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    className="tabular-nums"
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    Pieces
                                                </Label>
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    value={row.piece_count}
                                                    onChange={(event) =>
                                                        setRow(index, {
                                                            piece_count:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    className="tabular-nums"
                                                />
                                            </div>
                                            <div className="grid gap-1 text-right">
                                                <Label className="justify-end text-xs text-muted-foreground">
                                                    Amount
                                                </Label>
                                                <span className="pt-2 font-medium tabular-nums">
                                                    {money(lineTotal(row))}
                                                </span>
                                            </div>
                                        </div>
                                        {service &&
                                            Number(row.quantity || 0) <
                                                service.min_quantity && (
                                                <p className="text-xs text-muted-foreground">
                                                    Billed as{' '}
                                                    {quantity(
                                                        service.min_quantity,
                                                        service.unit_short,
                                                    )}{' '}
                                                    (minimum)
                                                </p>
                                            )}
                                        <InputError
                                            message={
                                                errors[
                                                    `items.${index}.service_id`
                                                ] ??
                                                errors[
                                                    `items.${index}.quantity`
                                                ]
                                            }
                                        />
                                    </div>
                                );
                            })}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    form.setData('items', [
                                        ...form.data.items,
                                        {
                                            service_id: '',
                                            quantity: '',
                                            piece_count: '',
                                        },
                                    ])
                                }
                            >
                                <Plus /> Add item
                            </Button>
                            <InputError message={errors.items} />
                        </div>
                    )}

                    <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <span className="grid gap-0.5">
                            <span className="text-sm font-medium">Express</span>
                            <span className="text-xs text-muted-foreground">
                                +{expressPercent}% surcharge
                            </span>
                        </span>
                        <Switch
                            checked={form.data.is_express}
                            onCheckedChange={(checked) =>
                                form.setData('is_express', checked)
                            }
                        />
                    </label>
                    <InputError message={errors.is_express} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-discount">Discount (₱)</Label>
                            <Input
                                id="edit-discount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.data.discount_amount}
                                onChange={(event) =>
                                    form.setData(
                                        'discount_amount',
                                        event.target.value,
                                    )
                                }
                                className="tabular-nums"
                            />
                            <InputError message={errors.discount_amount} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-discount-reason">
                                Discount reason
                            </Label>
                            <Input
                                id="edit-discount-reason"
                                value={form.data.discount_reason}
                                onChange={(event) =>
                                    form.setData(
                                        'discount_reason',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. Senior Citizen"
                            />
                            <InputError message={errors.discount_reason} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="edit-notes">Special instructions</Label>
                        <Textarea
                            id="edit-notes"
                            rows={2}
                            value={form.data.special_instructions}
                            onChange={(event) =>
                                form.setData(
                                    'special_instructions',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                </div>

                <SheetFooter className="border-t">
                    <div className="flex items-baseline justify-between text-sm">
                        <span className="text-muted-foreground">New total</span>
                        <span className="text-lg font-semibold tabular-nums">
                            {money(total)}
                        </span>
                    </div>
                    <Button
                        onClick={submit}
                        disabled={form.processing || services === undefined}
                    >
                        {form.processing && <Spinner />}
                        Save changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
