import { Head, router, useForm } from '@inertiajs/react';
import { addHours } from 'date-fns';
import {
    AlertTriangle,
    CalendarClock,
    ChevronDown,
    Plus,
    Printer,
    Save,
    Trash2,
    Truck,
    UserRound,
    Zap,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomerCombobox } from '@/components/customer-combobox';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { PageBody, PageHeader } from '@/components/page-header';
import { changeFor, PaymentFields } from '@/components/payment-fields';
import type { PaymentValues } from '@/components/payment-fields';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHotkey } from '@/hooks/use-hotkey';
import { friendlyDateTime, isoDate, money, quantity } from '@/lib/format';
import { searchEverything } from '@/lib/search';
import type { CustomerHit } from '@/lib/search';
import { cn } from '@/lib/utils';
import { create, index, receipt, store } from '@/routes/orders';
import type {
    Customer,
    PaymentMethodOption,
    Service,
    UserSummary,
} from '@/types/models';

type Props = {
    services: Service[];
    riders: UserSummary[];
    customer: Customer | null;
    pricing: {
        express_surcharge_percent: number;
        delivery_fee_per_trip: number;
        currency_symbol: string;
    };
    paymentMethods: PaymentMethodOption[];
};

type ItemRow = {
    key: number;
    service_id: string;
    quantity: string;
    piece_count: string;
    notes: string;
};

type Trip = {
    date: string;
    slot: string;
    address: string;
    contact_phone: string;
    rider_id: string;
};

type OrderForm = {
    customer_id: number | null;
    customer: {
        name: string;
        phone: string;
        email: string;
        address: string;
    } | null;
    items: ItemRow[];
    is_express: boolean;
    special_instructions: string;
    discount_amount: string;
    discount_reason: string;
    with_pickup: boolean;
    pickup: Trip;
    with_delivery: boolean;
    delivery: Trip;
    pay_now: boolean;
    payment: PaymentValues;
};

const TIME_SLOTS = [
    { value: '09:00', label: '9 AM' },
    { value: '13:00', label: '1 PM' },
    { value: '16:00', label: '4 PM' },
];

const NOTE_CHIPS = [
    'Separate whites',
    'No bleach',
    'Unscented softener',
    'Fold, do not hang',
    'Handle with care',
];

const DISCOUNT_PRESETS = [
    { label: 'Senior Citizen / PWD (20%)', rate: 0.2 },
    { label: 'Loyalty card (10%)', rate: 0.1 },
];

/** Same normalization as Customer::normalizePhone() so duplicates are caught while typing. */
function normalizePhone(value: string): string {
    const digits = value.replace(/\D+/g, '');

    if (digits.startsWith('639')) {
        return `0${digits.slice(2)}`;
    }

    return digits.length === 10 && digits.startsWith('9')
        ? `0${digits}`
        : digits;
}

let nextKey = 1;
const emptyItem = (serviceId = ''): ItemRow => ({
    key: nextKey++,
    service_id: serviceId,
    quantity: '',
    piece_count: '',
    notes: '',
});

const emptyTrip = (address = '', phone = ''): Trip => ({
    date: isoDate(new Date()),
    slot: '13:00',
    address,
    contact_phone: phone,
    rider_id: '',
});

export default function CreateOrder({
    services,
    riders,
    customer,
    pricing,
    paymentMethods,
}: Props) {
    const currency = pricing.currency_symbol;
    const servicesById = useMemo(
        () => new Map(services.map((service) => [String(service.id), service])),
        [services],
    );
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerHit | null>(customer);
    const [addingCustomer, setAddingCustomer] = useState(false);
    const [duplicate, setDuplicate] = useState<CustomerHit | null>(null);
    const [discountOpen, setDiscountOpen] = useState(false);
    const [amountTouched, setAmountTouched] = useState(false);
    const printAfterSave = useRef(false);
    const quantityRefs = useRef(new Map<number, HTMLInputElement>());

    const form = useForm<OrderForm>({
        customer_id: customer?.id ?? null,
        customer: null,
        items: [emptyItem()],
        is_express: false,
        special_instructions: '',
        discount_amount: '',
        discount_reason: '',
        with_pickup: false,
        pickup: emptyTrip(customer?.address ?? '', customer?.phone ?? ''),
        with_delivery: false,
        delivery: emptyTrip(customer?.address ?? '', customer?.phone ?? ''),
        pay_now: true,
        payment: {
            method: 'cash',
            amount: '',
            amount_tendered: '',
            reference_number: '',
        },
    });
    const { data, setData, processing } = form;
    const errors = form.errors as Record<string, string | undefined>;

    // ---- Live totals: the same formula as App\Data\OrderTotals (the server recomputes on save). ----
    const lines = data.items.map((item) => {
        const service = servicesById.get(item.service_id);
        const qty = Number(item.quantity || 0);
        const billable = service ? Math.max(qty, service.min_quantity) : 0;

        return {
            item,
            service,
            qty,
            billable,
            total:
                service && qty > 0
                    ? Math.round(billable * service.price * 100) / 100
                    : 0,
        };
    });
    const chosenServices = lines.flatMap((line) =>
        line.service ? [line.service] : [],
    );
    const expressBlockedBy = chosenServices.filter(
        (service) => !service.offers_express,
    );
    const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
    const expressFee = data.is_express
        ? Math.round(subtotal * pricing.express_surcharge_percent) / 100
        : 0;
    const trips = Number(data.with_pickup) + Number(data.with_delivery);
    const deliveryFee = trips * pricing.delivery_fee_per_trip;
    const discount = Number(data.discount_amount || 0);
    const total = Math.max(
        Math.round((subtotal + expressFee + deliveryFee - discount) * 100) /
            100,
        0,
    );
    const turnaround = chosenServices.length
        ? Math.max(
              ...chosenServices.map((service) =>
                  data.is_express && service.express_turnaround_hours
                      ? service.express_turnaround_hours
                      : service.turnaround_hours,
              ),
          )
        : null;
    const readyBy =
        !data.with_pickup && turnaround !== null
            ? addHours(new Date(), turnaround)
            : null;
    const isBooking = data.with_pickup;

    // Express can't apply when a chosen service doesn't offer it.
    useEffect(() => {
        if (data.is_express && expressBlockedBy.length > 0) {
            setData('is_express', false);
        }
    }, [data.is_express, expressBlockedBy.length, setData]);

    // Keep "amount paid" equal to the total until the cashier types their own amount.
    useEffect(() => {
        if (
            !amountTouched &&
            data.payment.amount !== (total > 0 ? total.toFixed(2) : '')
        ) {
            setData('payment', {
                ...data.payment,
                amount: total > 0 ? total.toFixed(2) : '',
            });
        }
    }, [total, amountTouched, data.payment, setData]);

    // Duplicate guard: as the new customer's mobile is typed, look for an existing customer with it.
    const newPhone = data.customer ? normalizePhone(data.customer.phone) : '';
    useEffect(() => {
        if (newPhone.length < 11) {
            setDuplicate(null);

            return;
        }

        const controller = new AbortController();
        searchEverything(newPhone, controller.signal)
            .then((found) =>
                setDuplicate(
                    found.customers.find((hit) => hit.phone === newPhone) ??
                        null,
                ),
            )
            .catch(() => undefined);

        return () => controller.abort();
    }, [newPhone]);

    // ---- Customer ----
    const chooseCustomer = (hit: CustomerHit | null) => {
        setSelectedCustomer(hit);
        setAddingCustomer(false);
        setDuplicate(null);
        setData((current) => ({
            ...current,
            customer_id: hit?.id ?? null,
            customer: null,
            pickup: {
                ...current.pickup,
                address: hit?.address ?? '',
                contact_phone: hit?.phone ?? '',
            },
            delivery: {
                ...current.delivery,
                address: hit?.address ?? '',
                contact_phone: hit?.phone ?? '',
            },
        }));
    };

    const startNewCustomer = (typed: string) => {
        const looksLikePhone = /^[+\d\s-]{4,}$/.test(typed);
        setSelectedCustomer(null);
        setAddingCustomer(true);
        setData((current) => ({
            ...current,
            customer_id: null,
            customer: {
                name: looksLikePhone ? '' : typed,
                phone: looksLikePhone ? typed : '',
                email: '',
                address: '',
            },
        }));
    };

    const setNewCustomer = (
        patch: Partial<NonNullable<OrderForm['customer']>>,
    ) => {
        setData((current) => {
            const next = {
                ...(current.customer ?? {
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                }),
                ...patch,
            };

            return {
                ...current,
                customer: next,
                pickup: {
                    ...current.pickup,
                    address: next.address,
                    contact_phone: next.phone,
                },
                delivery: {
                    ...current.delivery,
                    address: next.address,
                    contact_phone: next.phone,
                },
            };
        });
    };

    // ---- Items ----
    const updateItem = (key: number, patch: Partial<ItemRow>) =>
        setData(
            'items',
            data.items.map((item) =>
                item.key === key ? { ...item, ...patch } : item,
            ),
        );

    const addItem = (serviceId = '') => {
        // Reuse an empty first row instead of stacking blank rows.
        const blank = data.items.find(
            (item) => item.service_id === '' && item.quantity === '',
        );
        const row = blank
            ? { ...blank, service_id: serviceId }
            : emptyItem(serviceId);
        setData(
            'items',
            blank
                ? data.items.map((item) =>
                      item.key === blank.key ? row : item,
                  )
                : [...data.items, row],
        );
        window.setTimeout(() => quantityRefs.current.get(row.key)?.focus(), 0);
    };

    const removeItem = (key: number) =>
        setData(
            'items',
            data.items.length > 1
                ? data.items.filter((item) => item.key !== key)
                : [emptyItem()],
        );

    const addNote = (note: string) =>
        setData(
            'special_instructions',
            data.special_instructions
                ? `${data.special_instructions}; ${note}`
                : note,
        );

    // ---- Submit ----
    const submit = (print: boolean) => {
        printAfterSave.current = print;

        form.transform((current) => {
            const trip = (value: Trip) => ({
                scheduled_at: `${value.date} ${value.slot}:00`,
                address: value.address,
                contact_phone: value.contact_phone || null,
                rider_id: value.rider_id ? Number(value.rider_id) : null,
            });
            const items = current.items
                .filter(
                    (item) => item.service_id !== '' || item.quantity !== '',
                )
                .map((item) => ({
                    service_id: item.service_id
                        ? Number(item.service_id)
                        : null,
                    quantity: item.quantity,
                    piece_count: item.piece_count || null,
                    notes: item.notes || null,
                }));

            return {
                customer_id: current.customer_id,
                customer: current.customer_id ? null : current.customer,
                items,
                is_express: current.is_express,
                special_instructions: current.special_instructions || null,
                discount_amount: current.discount_amount || null,
                discount_reason: current.discount_reason || null,
                pickup: current.with_pickup ? trip(current.pickup) : null,
                delivery: current.with_delivery ? trip(current.delivery) : null,
                // A booked pickup isn't weighed yet, so nothing is collected now.
                payment:
                    current.pay_now &&
                    !current.with_pickup &&
                    Number(current.payment.amount) > 0
                        ? {
                              method: current.payment.method,
                              amount: current.payment.amount,
                              amount_tendered:
                                  current.payment.method === 'cash'
                                      ? current.payment.amount_tendered ||
                                        current.payment.amount
                                      : null,
                              reference_number:
                                  current.payment.reference_number || null,
                          }
                        : null,
            };
        });

        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: (page) => {
                const order = (page.props as { order?: { id: number } }).order;

                if (printAfterSave.current && order) {
                    router.visit(
                        receipt(order.id, { query: { autoprint: 1 } }),
                    );
                }
            },
            onError: () => {
                // Bring the first invalid field into view.
                window.setTimeout(() => {
                    const invalid = document.querySelector<HTMLElement>(
                        '[aria-invalid="true"]',
                    );
                    invalid?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                    invalid?.focus({ preventScroll: true });
                }, 50);
            },
        });
    };

    useHotkey('mod+enter', () => !processing && submit(true), {
        allowInInputs: true,
    });

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        submit(false);
    };

    const change = changeFor(data.payment);
    const quickServices = services.slice(0, 5);

    return (
        <>
            <Head title="New order" />
            <form onSubmit={onSubmit} className="contents">
                <PageBody className="pb-28 lg:pb-6">
                    <PageHeader
                        title="New order"
                        description={
                            <>
                                Save & print with <Kbd>Ctrl</Kbd>{' '}
                                <Kbd>Enter</Kbd>
                            </>
                        }
                    />

                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                        <div className="grid gap-6">
                            {/* 1. Customer */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StepNumber n={1} /> Customer
                                    </CardTitle>
                                    <CardDescription>
                                        Search first — every customer is
                                        identified by their mobile number.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="customer">
                                            Customer
                                        </Label>
                                        <CustomerCombobox
                                            id="customer"
                                            value={selectedCustomer}
                                            onSelect={chooseCustomer}
                                            onCreateNew={startNewCustomer}
                                            invalid={!!errors.customer_id}
                                            autoFocus={!customer}
                                        />
                                        <InputError
                                            message={errors.customer_id}
                                        />
                                    </div>

                                    {addingCustomer && data.customer && (
                                        <div className="grid gap-4 rounded-lg border border-dashed p-4">
                                            <p className="flex items-center gap-2 text-sm font-medium">
                                                <UserRound className="size-4" />{' '}
                                                New customer
                                            </p>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="customer-name">
                                                        Full name
                                                    </Label>
                                                    <Input
                                                        id="customer-name"
                                                        value={
                                                            data.customer.name
                                                        }
                                                        onChange={(event) =>
                                                            setNewCustomer({
                                                                name: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        aria-invalid={
                                                            !!errors[
                                                                'customer.name'
                                                            ]
                                                        }
                                                        autoFocus
                                                    />
                                                    <InputError
                                                        message={
                                                            errors[
                                                                'customer.name'
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="customer-phone">
                                                        Mobile number
                                                    </Label>
                                                    <Input
                                                        id="customer-phone"
                                                        type="tel"
                                                        inputMode="tel"
                                                        placeholder="0917 123 4567"
                                                        value={
                                                            data.customer.phone
                                                        }
                                                        onChange={(event) =>
                                                            setNewCustomer({
                                                                phone: event
                                                                    .target
                                                                    .value,
                                                            })
                                                        }
                                                        aria-invalid={
                                                            !!errors[
                                                                'customer.phone'
                                                            ]
                                                        }
                                                        className="font-mono"
                                                    />
                                                    <InputError
                                                        message={
                                                            errors[
                                                                'customer.phone'
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2 sm:col-span-2">
                                                    <Label htmlFor="customer-address">
                                                        Address (optional)
                                                    </Label>
                                                    <Input
                                                        id="customer-address"
                                                        value={
                                                            data.customer
                                                                .address
                                                        }
                                                        onChange={(event) =>
                                                            setNewCustomer({
                                                                address:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {duplicate && (
                                                <Alert className="border-warning/40 bg-warning/10">
                                                    <AlertTriangle className="text-warning!" />
                                                    <AlertTitle>
                                                        This number belongs to{' '}
                                                        {duplicate.name}
                                                    </AlertTitle>
                                                    <AlertDescription className="flex flex-wrap items-center gap-3">
                                                        Use the existing
                                                        customer to keep their
                                                        history in one place.
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() =>
                                                                chooseCustomer(
                                                                    duplicate,
                                                                )
                                                            }
                                                        >
                                                            Use {duplicate.name}
                                                        </Button>
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 2. Items */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StepNumber n={2} /> Laundry
                                    </CardTitle>
                                    <CardDescription>
                                        {isBooking
                                            ? 'Optional for pickups — the laundry is weighed when it arrives.'
                                            : 'Weigh the laundry and count the pieces.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {quickServices.map((service) => (
                                            <Button
                                                key={service.id}
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    addItem(String(service.id))
                                                }
                                            >
                                                <Plus />
                                                {service.name}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="grid gap-3">
                                        {lines.map(
                                            (
                                                {
                                                    item,
                                                    service,
                                                    qty,
                                                    billable,
                                                    total: lineTotal,
                                                },
                                                index,
                                            ) => (
                                                <div
                                                    key={item.key}
                                                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_110px_90px_110px_auto] sm:items-start"
                                                >
                                                    <div className="grid gap-1.5">
                                                        <Label
                                                            htmlFor={`service-${item.key}`}
                                                            className="sm:sr-only"
                                                        >
                                                            Service
                                                        </Label>
                                                        <Select
                                                            value={
                                                                item.service_id
                                                            }
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                updateItem(
                                                                    item.key,
                                                                    {
                                                                        service_id:
                                                                            value,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                id={`service-${item.key}`}
                                                                className="w-full"
                                                                aria-invalid={
                                                                    !!errors[
                                                                        `items.${index}.service_id`
                                                                    ]
                                                                }
                                                            >
                                                                <SelectValue placeholder="Choose a service" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {services.map(
                                                                    (
                                                                        option,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                option.id
                                                                            }
                                                                            value={String(
                                                                                option.id,
                                                                            )}
                                                                        >
                                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                                {
                                                                                    option.code
                                                                                }
                                                                            </span>
                                                                            {
                                                                                option.name
                                                                            }
                                                                            <span className="text-muted-foreground">
                                                                                {money(
                                                                                    option.price,
                                                                                    currency,
                                                                                )}
                                                                                /
                                                                                {
                                                                                    option.unit_short
                                                                                }
                                                                            </span>
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <InputError
                                                            message={
                                                                errors[
                                                                    `items.${index}.service_id`
                                                                ]
                                                            }
                                                        />
                                                        {service &&
                                                            qty > 0 &&
                                                            billable > qty && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Billed as{' '}
                                                                    {quantity(
                                                                        billable,
                                                                        service.unit_short,
                                                                    )}{' '}
                                                                    (minimum)
                                                                </p>
                                                            )}
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label
                                                            htmlFor={`qty-${item.key}`}
                                                            className="sm:sr-only"
                                                        >
                                                            Quantity
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                id={`qty-${item.key}`}
                                                                ref={(
                                                                    element,
                                                                ) => {
                                                                    if (element)
                                                                        quantityRefs.current.set(
                                                                            item.key,
                                                                            element,
                                                                        );
                                                                    else
                                                                        quantityRefs.current.delete(
                                                                            item.key,
                                                                        );
                                                                }}
                                                                type="number"
                                                                inputMode="decimal"
                                                                min="0"
                                                                step={
                                                                    service?.pricing_unit ===
                                                                    'per_item'
                                                                        ? '1'
                                                                        : '0.1'
                                                                }
                                                                placeholder="0"
                                                                value={
                                                                    item.quantity
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateItem(
                                                                        item.key,
                                                                        {
                                                                            quantity:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                aria-invalid={
                                                                    !!errors[
                                                                        `items.${index}.quantity`
                                                                    ]
                                                                }
                                                                className="pr-9 text-right tabular-nums"
                                                            />
                                                            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                                                                {service?.unit_short ??
                                                                    'kg'}
                                                            </span>
                                                        </div>
                                                        <InputError
                                                            message={
                                                                errors[
                                                                    `items.${index}.quantity`
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                    <div className="grid gap-1.5">
                                                        <Label
                                                            htmlFor={`pcs-${item.key}`}
                                                            className="sm:sr-only"
                                                        >
                                                            Pieces
                                                        </Label>
                                                        <Input
                                                            id={`pcs-${item.key}`}
                                                            type="number"
                                                            inputMode="numeric"
                                                            min="0"
                                                            placeholder="pcs"
                                                            value={
                                                                item.piece_count
                                                            }
                                                            onChange={(event) =>
                                                                updateItem(
                                                                    item.key,
                                                                    {
                                                                        piece_count:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    },
                                                                )
                                                            }
                                                            className="text-right tabular-nums"
                                                            aria-label="Number of pieces"
                                                        />
                                                    </div>
                                                    <div className="flex h-9 items-center justify-end text-sm font-medium tabular-nums">
                                                        {money(
                                                            lineTotal,
                                                            currency,
                                                        )}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            removeItem(item.key)
                                                        }
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                    <InputError message={errors.items} />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="justify-self-start"
                                        onClick={() => addItem()}
                                    >
                                        <Plus /> Add item
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* 3. Options */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StepNumber n={3} /> Options
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-5">
                                    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                                        <div className="grid gap-1">
                                            <Label
                                                htmlFor="express"
                                                className="flex items-center gap-1.5"
                                            >
                                                <Zap className="size-4 text-warning" />{' '}
                                                Express service
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                +
                                                {
                                                    pricing.express_surcharge_percent
                                                }
                                                %
                                                {data.is_express && readyBy && (
                                                    <>
                                                        {' '}
                                                        · ready by{' '}
                                                        {friendlyDateTime(
                                                            readyBy,
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                            <InputError
                                                message={errors.is_express}
                                            />
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span>
                                                    <Switch
                                                        id="express"
                                                        checked={
                                                            data.is_express
                                                        }
                                                        disabled={
                                                            expressBlockedBy.length >
                                                            0
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            setData(
                                                                'is_express',
                                                                checked,
                                                            )
                                                        }
                                                    />
                                                </span>
                                            </TooltipTrigger>
                                            {expressBlockedBy.length > 0 && (
                                                <TooltipContent>
                                                    No express for{' '}
                                                    {expressBlockedBy
                                                        .map(
                                                            (service) =>
                                                                service.name,
                                                        )
                                                        .join(', ')}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="instructions">
                                            Special instructions
                                        </Label>
                                        <Textarea
                                            id="instructions"
                                            rows={2}
                                            value={data.special_instructions}
                                            onChange={(event) =>
                                                setData(
                                                    'special_instructions',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="e.g. separate whites"
                                        />
                                        <div className="flex flex-wrap gap-1.5">
                                            {NOTE_CHIPS.map((note) => (
                                                <Button
                                                    key={note}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 rounded-full text-xs"
                                                    onClick={() =>
                                                        addNote(note)
                                                    }
                                                >
                                                    {note}
                                                </Button>
                                            ))}
                                        </div>
                                        <InputError
                                            message={
                                                errors.special_instructions
                                            }
                                        />
                                    </div>

                                    <Collapsible
                                        open={
                                            discountOpen ||
                                            !!data.discount_amount
                                        }
                                        onOpenChange={setDiscountOpen}
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-2"
                                            >
                                                <ChevronDown
                                                    className={cn(
                                                        'transition-transform',
                                                        (discountOpen ||
                                                            data.discount_amount) &&
                                                            'rotate-180',
                                                    )}
                                                />
                                                Add discount
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="discount-reason">
                                                    Reason
                                                </Label>
                                                <Select
                                                    value={
                                                        DISCOUNT_PRESETS.some(
                                                            (preset) =>
                                                                preset.label ===
                                                                data.discount_reason,
                                                        )
                                                            ? data.discount_reason
                                                            : data.discount_reason
                                                              ? 'other'
                                                              : ''
                                                    }
                                                    onValueChange={(value) => {
                                                        const preset =
                                                            DISCOUNT_PRESETS.find(
                                                                (option) =>
                                                                    option.label ===
                                                                    value,
                                                            );
                                                        setData((current) => ({
                                                            ...current,
                                                            discount_reason:
                                                                value ===
                                                                'other'
                                                                    ? 'Other'
                                                                    : value,
                                                            discount_amount:
                                                                preset
                                                                    ? (
                                                                          Math.round(
                                                                              subtotal *
                                                                                  preset.rate *
                                                                                  100,
                                                                          ) /
                                                                          100
                                                                      ).toFixed(
                                                                          2,
                                                                      )
                                                                    : current.discount_amount,
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        id="discount-reason"
                                                        className="w-full"
                                                        aria-invalid={
                                                            !!errors.discount_reason
                                                        }
                                                    >
                                                        <SelectValue placeholder="Choose a reason" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DISCOUNT_PRESETS.map(
                                                            (preset) => (
                                                                <SelectItem
                                                                    key={
                                                                        preset.label
                                                                    }
                                                                    value={
                                                                        preset.label
                                                                    }
                                                                >
                                                                    {
                                                                        preset.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                        <SelectItem value="other">
                                                            Other…
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {!DISCOUNT_PRESETS.some(
                                                    (preset) =>
                                                        preset.label ===
                                                        data.discount_reason,
                                                ) &&
                                                    data.discount_reason !==
                                                        '' && (
                                                        <Input
                                                            value={
                                                                data.discount_reason ===
                                                                'Other'
                                                                    ? ''
                                                                    : data.discount_reason
                                                            }
                                                            onChange={(event) =>
                                                                setData(
                                                                    'discount_reason',
                                                                    event.target
                                                                        .value ||
                                                                        'Other',
                                                                )
                                                            }
                                                            placeholder="Describe the discount"
                                                        />
                                                    )}
                                                <InputError
                                                    message={
                                                        errors.discount_reason
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="discount-amount">
                                                    Amount ({currency})
                                                </Label>
                                                <Input
                                                    id="discount-amount"
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0"
                                                    step="0.01"
                                                    value={data.discount_amount}
                                                    onChange={(event) =>
                                                        setData(
                                                            'discount_amount',
                                                            event.target.value,
                                                        )
                                                    }
                                                    aria-invalid={
                                                        !!errors.discount_amount
                                                    }
                                                    className="text-right tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors.discount_amount
                                                    }
                                                />
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </CardContent>
                            </Card>

                            {/* 4. Pickup & delivery */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <StepNumber n={4} /> Pickup & delivery
                                    </CardTitle>
                                    <CardDescription>
                                        {money(
                                            pricing.delivery_fee_per_trip,
                                            currency,
                                        )}{' '}
                                        per trip. Leave both off for walk-in
                                        drop-off and claim.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <TripFields
                                        icon={CalendarClock}
                                        title="Pick up from the customer"
                                        hint="Order starts as “For Pickup” and is weighed on arrival."
                                        enabled={data.with_pickup}
                                        onToggle={(checked) =>
                                            setData('with_pickup', checked)
                                        }
                                        trip={data.pickup}
                                        onChange={(trip) =>
                                            setData('pickup', trip)
                                        }
                                        riders={riders}
                                        errors={errors}
                                        errorPrefix="pickup."
                                    />
                                    <TripFields
                                        icon={Truck}
                                        title="Deliver when ready"
                                        hint="The rider brings the finished laundry back."
                                        enabled={data.with_delivery}
                                        onToggle={(checked) =>
                                            setData('with_delivery', checked)
                                        }
                                        trip={data.delivery}
                                        onChange={(trip) =>
                                            setData('delivery', trip)
                                        }
                                        riders={riders}
                                        errors={errors}
                                        errorPrefix="delivery."
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Summary (sticky on desktop) */}
                        <Card className="gap-4 lg:sticky lg:top-20">
                            <CardHeader>
                                <CardTitle>Summary</CardTitle>
                                {data.is_express && (
                                    <CardAction>
                                        <Badge className="border-transparent bg-warning text-white dark:text-neutral-950">
                                            <Zap /> Express
                                        </Badge>
                                    </CardAction>
                                )}
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <dl className="grid gap-1.5 text-sm">
                                    {lines
                                        .filter(
                                            (line) =>
                                                line.service && line.qty > 0,
                                        )
                                        .map(
                                            ({
                                                item,
                                                service,
                                                qty,
                                                total: lineTotal,
                                            }) => (
                                                <div
                                                    key={item.key}
                                                    className="flex justify-between gap-2"
                                                >
                                                    <dt className="truncate text-muted-foreground">
                                                        {service?.name} ·{' '}
                                                        {quantity(
                                                            qty,
                                                            service?.unit_short,
                                                        )}
                                                    </dt>
                                                    <dd className="tabular-nums">
                                                        {money(
                                                            lineTotal,
                                                            currency,
                                                        )}
                                                    </dd>
                                                </div>
                                            ),
                                        )}
                                    {expressFee > 0 && (
                                        <SummaryRow
                                            label={`Express (+${pricing.express_surcharge_percent}%)`}
                                            value={money(expressFee, currency)}
                                        />
                                    )}
                                    {deliveryFee > 0 && (
                                        <SummaryRow
                                            label={`Pickup/delivery (${trips} trip${trips > 1 ? 's' : ''})`}
                                            value={money(deliveryFee, currency)}
                                        />
                                    )}
                                    {discount > 0 && (
                                        <SummaryRow
                                            label={`Discount${data.discount_reason ? ` (${data.discount_reason})` : ''}`}
                                            value={`-${money(discount, currency)}`}
                                        />
                                    )}
                                </dl>
                                <Separator />
                                <div className="flex items-baseline justify-between">
                                    <span className="font-medium">Total</span>
                                    <span className="text-3xl font-semibold tabular-nums">
                                        {money(total, currency)}
                                    </span>
                                </div>
                                {readyBy && (
                                    <p className="text-sm text-muted-foreground">
                                        Ready by{' '}
                                        <span className="font-medium text-foreground">
                                            {friendlyDateTime(readyBy)}
                                        </span>
                                    </p>
                                )}
                                <Separator />

                                {isBooking ? (
                                    <p className="text-sm text-muted-foreground">
                                        Payment is collected after the laundry
                                        is weighed.
                                    </p>
                                ) : (
                                    <>
                                        <RadioGroup
                                            value={
                                                data.pay_now ? 'now' : 'later'
                                            }
                                            onValueChange={(value) =>
                                                setData(
                                                    'pay_now',
                                                    value === 'now',
                                                )
                                            }
                                            className="grid grid-cols-2 gap-2"
                                        >
                                            {[
                                                {
                                                    value: 'now',
                                                    label: 'Pay now',
                                                },
                                                {
                                                    value: 'later',
                                                    label: 'Pay on pickup',
                                                },
                                            ].map((option) => (
                                                <Label
                                                    key={option.value}
                                                    htmlFor={`pay-${option.value}`}
                                                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                                >
                                                    <RadioGroupItem
                                                        id={`pay-${option.value}`}
                                                        value={option.value}
                                                    />
                                                    {option.label}
                                                </Label>
                                            ))}
                                        </RadioGroup>
                                        {data.pay_now && total > 0 && (
                                            <PaymentFields
                                                values={data.payment}
                                                onChange={(values) => {
                                                    if (
                                                        values.amount !==
                                                        data.payment.amount
                                                    )
                                                        setAmountTouched(true);
                                                    setData('payment', values);
                                                }}
                                                methods={paymentMethods}
                                                balance={total}
                                                errors={errors}
                                                errorPrefix="payment."
                                                currency={currency}
                                            />
                                        )}
                                    </>
                                )}

                                <div className="hidden gap-2 lg:grid">
                                    <SaveButtons
                                        processing={processing}
                                        onSaveAndPrint={() => submit(true)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </PageBody>

                {/* Phone/tablet: sticky total + save */}
                <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
                    <div className="mx-auto flex max-w-3xl items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">
                                Total
                                {change > 0 &&
                                    ` · change ${money(change, currency)}`}
                            </p>
                            <p className="text-xl font-semibold tabular-nums">
                                {money(total, currency)}
                            </p>
                        </div>
                        <SaveButtons
                            processing={processing}
                            onSaveAndPrint={() => submit(true)}
                            compact
                        />
                    </div>
                </div>
            </form>
        </>
    );
}

function StepNumber({ n }: { n: number }) {
    return (
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {n}
        </span>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-2">
            <dt className="truncate text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
        </div>
    );
}

function SaveButtons({
    processing,
    onSaveAndPrint,
    compact = false,
}: {
    processing: boolean;
    onSaveAndPrint: () => void;
    compact?: boolean;
}) {
    return (
        <>
            <Button
                type="button"
                size={compact ? 'default' : 'lg'}
                disabled={processing}
                onClick={onSaveAndPrint}
            >
                {processing ? <Spinner /> : <Printer />}
                Save & print
                {!compact && (
                    <Kbd className="ml-1 bg-primary-foreground/15 text-primary-foreground">
                        Ctrl ↵
                    </Kbd>
                )}
            </Button>
            <Button
                type="submit"
                variant="outline"
                size={compact ? 'default' : 'lg'}
                disabled={processing}
            >
                <Save />
                {compact ? 'Save' : 'Save only'}
            </Button>
        </>
    );
}

/**
 * Switch + date, time slot, address, phone and rider for a pickup or delivery trip.
 */
function TripFields({
    icon: Icon,
    title,
    hint,
    enabled,
    onToggle,
    trip,
    onChange,
    riders,
    errors,
    errorPrefix,
}: {
    icon: typeof Truck;
    title: string;
    hint: string;
    enabled: boolean;
    onToggle: (checked: boolean) => void;
    trip: Trip;
    onChange: (trip: Trip) => void;
    riders: UserSummary[];
    errors: Record<string, string | undefined>;
    errorPrefix: string;
}) {
    const id = errorPrefix.replace('.', '');
    const set = (patch: Partial<Trip>) => onChange({ ...trip, ...patch });

    return (
        <div
            className={cn(
                'rounded-lg border p-3',
                enabled && 'border-primary/40 bg-primary/[0.03]',
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                    <Label
                        htmlFor={`${id}-toggle`}
                        className="flex items-center gap-1.5"
                    >
                        <Icon className="size-4" /> {title}
                    </Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <Switch
                    id={`${id}-toggle`}
                    checked={enabled}
                    onCheckedChange={onToggle}
                />
            </div>

            {enabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor={`${id}-date`}>Date</Label>
                        <DatePicker
                            id={`${id}-date`}
                            value={trip.date}
                            onChange={(date) => set({ date })}
                            disablePast
                        />
                        <InputError
                            message={errors[`${errorPrefix}scheduled_at`]}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Time</Label>
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={trip.slot}
                            onValueChange={(slot) => slot && set({ slot })}
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
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor={`${id}-address`}>Address</Label>
                        <Textarea
                            id={`${id}-address`}
                            rows={2}
                            value={trip.address}
                            onChange={(event) =>
                                set({ address: event.target.value })
                            }
                            aria-invalid={!!errors[`${errorPrefix}address`]}
                        />
                        <InputError message={errors[`${errorPrefix}address`]} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${id}-phone`}>Contact number</Label>
                        <Input
                            id={`${id}-phone`}
                            type="tel"
                            value={trip.contact_phone}
                            onChange={(event) =>
                                set({ contact_phone: event.target.value })
                            }
                            aria-invalid={
                                !!errors[`${errorPrefix}contact_phone`]
                            }
                            className="font-mono"
                        />
                        <InputError
                            message={errors[`${errorPrefix}contact_phone`]}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${id}-rider`}>Rider</Label>
                        <Select
                            value={trip.rider_id || 'later'}
                            onValueChange={(value) =>
                                set({
                                    rider_id: value === 'later' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger
                                id={`${id}-rider`}
                                className="w-full"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="later">
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
                        <InputError
                            message={errors[`${errorPrefix}rider_id`]}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

CreateOrder.layout = {
    breadcrumbs: [
        { title: 'Orders', href: index() },
        { title: 'New order', href: create() },
    ],
};
