import { router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarX } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookingConfirmationDialog } from '@/components/public/booking-confirmation-dialog';
import { BookingDatePicker } from '@/components/public/booking-date-picker';
import { BookingSlots } from '@/components/public/booking-slots';
import {
    BookingSummary,
    EstimateTotal,
} from '@/components/public/booking-summary';
import { PageHero } from '@/components/public/page-hero';
import {
    FormAlert,
    HoneypotField,
    PublicField,
    focusFirstError,
} from '@/components/public/public-form';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { displayPhone, estimate, peso, telHref } from '@/lib/public-site';
import { privacy } from '@/routes/public';
import { store } from '@/routes/public/book';
import type { Service } from '@/types/models';
import type {
    BookableDate,
    BookingConfirmation,
    BookingSlot,
    PricingRules,
    Seo,
} from '@/types/public';

type Props = {
    services: Service[];
    pricing: PricingRules;
    dates: BookableDate[];
    selectedDate: string;
    slots: BookingSlot[];
    formToken: string;
    seo: Seo;
};

type BookingForm = {
    name: string;
    phone: string;
    email: string;
    address: string;
    pickup_date: string;
    time_slot: string;
    service_id: string;
    estimated_quantity: string;
    is_express: boolean;
    wants_delivery: boolean;
    special_instructions: string;
    consent: boolean;
    website: string;
    form_token: string;
};

/** Form order, for moving focus to the first error. */
const FIELDS = [
    'pickup_date',
    'time_slot',
    'name',
    'phone',
    'email',
    'address',
    'service_id',
    'estimated_quantity',
    'special_instructions',
    'consent',
];

const NO_SERVICE = 'none';

/** ?service=&qty= from the Pricing page estimator. */
function prefill(url: string, services: Service[]) {
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const serviceId = query.get('service') ?? '';
    const qty = Number(query.get('qty'));

    return {
        service_id: services.some((service) => String(service.id) === serviceId)
            ? serviceId
            : '',
        estimated_quantity: qty > 0 && qty <= 200 ? String(qty) : '',
    };
}

/**
 * Guest "Book a Pickup" (docs/public-site/04 §6): when, who, what. Saved as a booking
 * request that staff confirm by SMS.
 */
export default function BookPickup({
    services,
    pricing,
    dates,
    selectedDate,
    slots,
    formToken,
    seo,
}: Props) {
    const page = usePage();
    const { site } = page.props;
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [dismissed, setDismissed] = useState<string | null>(null);

    const [initial] = useState<BookingForm>(() => ({
        name: '',
        phone: '',
        email: '',
        address: '',
        pickup_date: selectedDate,
        time_slot: '',
        is_express: false,
        wants_delivery: true,
        special_instructions: '',
        consent: false,
        website: '',
        form_token: formToken,
        ...prefill(page.url, services),
    }));
    const form = useForm<BookingForm>(initial);
    const { data, setData } = form;
    const errors = form.errors as Record<string, string | undefined>;

    const booking =
        (page.flash.booking as BookingConfirmation | undefined) ?? null;
    const confirmation =
        booking && booking.reference !== dismissed ? booking : null;

    const service =
        services.find((entry) => String(entry.id) === data.service_id) ?? null;
    const perKg = service ? service.pricing_unit === 'per_kg' : true;
    const expressAllowed = service ? service.offers_express : true;
    const slot = slots.find((entry) => entry.value === data.time_slot) ?? null;
    const quantity = Number(data.estimated_quantity) || null;
    const total = estimate(service, quantity ?? 0, {
        express: data.is_express && expressAllowed,
        trips: 1 + (data.wants_delivery ? 1 : 0),
        rules: pricing,
    });
    const symbol = pricing.currency_symbol ?? site.currency_symbol;
    // The chosen service's express time, else the fastest express time of any service.
    const expressTimes = services.flatMap((entry) =>
        entry.express_turnaround_hours ? [entry.express_turnaround_hours] : [],
    );
    const expressHours =
        service?.express_turnaround_hours ??
        (expressTimes.length > 0 ? Math.min(...expressTimes) : null);

    // Slots belong to `selectedDate`; while another day loads, show placeholders.
    const slotsForDate = selectedDate === data.pickup_date && !loadingSlots;
    const allFull = slotsForDate && slots.every((entry) => !entry.available);
    const nextAvailable = dates.find(
        (entry) => entry.date > data.pickup_date && entry.available,
    );

    const chooseDate = (date: string) => {
        setData((current) => ({
            ...current,
            pickup_date: date,
            time_slot: '',
        }));
        router.reload({
            only: ['slots', 'selectedDate'],
            data: { date },
            onStart: () => setLoadingSlots(true),
            onFinish: () => setLoadingSlots(false),
        });
    };

    const chooseService = (value: string) => {
        const id = value === NO_SERVICE ? '' : value;
        const next = services.find((entry) => String(entry.id) === id);

        setData((current) => ({
            ...current,
            service_id: id,
            is_express:
                next && !next.offers_express ? false : current.is_express,
        }));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            service_id: values.service_id || null,
            estimated_quantity: values.estimated_quantity || null,
            email: values.email || null,
            special_instructions: values.special_instructions || null,
            is_express: values.is_express && expressAllowed,
        }));
        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: (response) => {
                // Fresh form for the next booking; the server sends a new time token.
                form.setData({
                    ...initial,
                    service_id: '',
                    estimated_quantity: '',
                    pickup_date: stringProp(
                        response.props.selectedDate,
                        selectedDate,
                    ),
                    form_token: stringProp(response.props.formToken, formToken),
                });
                form.clearErrors();
            },
            onError: (fieldErrors) =>
                focusFirstError('book', FIELDS, fieldErrors),
        });
    };

    return (
        <>
            <SeoHead seo={seo} />
            <PageHero
                breadcrumb="Book a Pickup"
                title="Book a pickup"
                description="Tell us when and where. Our rider comes to your door, and we’ll confirm by SMS."
            />

            <Section className="py-10 md:py-16">
                <form
                    onSubmit={submit}
                    noValidate
                    className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start"
                >
                    <div className="grid gap-8">
                        <FormAlert message={errors.form} />
                        <HoneypotField
                            value={data.website}
                            onChange={(value) => setData('website', value)}
                        />

                        <Step number={1} title="When should we come?">
                            <PublicField
                                id="book-pickup_date"
                                label="Pickup date"
                                error={errors.pickup_date}
                            >
                                {(aria) => (
                                    <BookingDatePicker
                                        id={aria.id}
                                        describedBy={aria['aria-describedby']}
                                        dates={dates}
                                        value={data.pickup_date}
                                        onChange={chooseDate}
                                    />
                                )}
                            </PublicField>

                            <PublicField
                                id="book-time_slot"
                                label="Pickup time"
                                error={errors.time_slot}
                            >
                                {(aria) => (
                                    <BookingSlots
                                        id={aria.id}
                                        describedBy={aria['aria-describedby']}
                                        invalid={aria['aria-invalid']}
                                        slots={slots}
                                        loading={!slotsForDate}
                                        value={data.time_slot}
                                        onChange={(value) =>
                                            setData('time_slot', value)
                                        }
                                    />
                                )}
                            </PublicField>

                            {allFull && (
                                <Alert>
                                    <CalendarX aria-hidden />
                                    <AlertTitle>This day is full</AlertTitle>
                                    <AlertDescription>
                                        <p>
                                            All pickup times on{' '}
                                            {format(
                                                parseISO(data.pickup_date),
                                                'EEEE, MMMM d',
                                            )}{' '}
                                            are taken.
                                            {nextAvailable &&
                                                ` Try ${format(parseISO(nextAvailable.date), 'EEEE, MMMM d')}`}
                                            {site.phone ? (
                                                <>
                                                    , or{' '}
                                                    <a
                                                        href={telHref(
                                                            site.phone,
                                                        )}
                                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                                    >
                                                        call us at{' '}
                                                        {displayPhone(
                                                            site.phone,
                                                        )}
                                                    </a>{' '}
                                                    — we’ll try to fit you in.
                                                </>
                                            ) : (
                                                '.'
                                            )}
                                        </p>
                                        {nextAvailable && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() =>
                                                    chooseDate(
                                                        nextAvailable.date,
                                                    )
                                                }
                                            >
                                                Show{' '}
                                                {format(
                                                    parseISO(
                                                        nextAvailable.date,
                                                    ),
                                                    'EEE, MMM d',
                                                )}
                                            </Button>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </Step>

                        <Step number={2} title="Your details">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <PublicField
                                    id="book-name"
                                    label="Full name"
                                    error={errors.name}
                                    className="sm:col-span-2"
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="name"
                                            autoComplete="name"
                                            value={data.name}
                                            onChange={(event) =>
                                                setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Juan Dela Cruz"
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>
                                <PublicField
                                    id="book-phone"
                                    label="Mobile number"
                                    description="We’ll text your confirmation here."
                                    error={errors.phone}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            value={data.phone}
                                            onChange={(event) =>
                                                setData(
                                                    'phone',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0917 123 4567"
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>
                                <PublicField
                                    id="book-email"
                                    label="Email"
                                    optional
                                    description="For a copy of your confirmation."
                                    error={errors.email}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={data.email}
                                            onChange={(event) =>
                                                setData(
                                                    'email',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="you@example.com"
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>
                                <PublicField
                                    id="book-address"
                                    label="Pickup address"
                                    error={errors.address}
                                    className="sm:col-span-2"
                                >
                                    {(aria) => (
                                        <Textarea
                                            {...aria}
                                            name="address"
                                            autoComplete="street-address"
                                            rows={2}
                                            value={data.address}
                                            onChange={(event) =>
                                                setData(
                                                    'address',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="House no., street, barangay, landmark"
                                            className="text-base"
                                        />
                                    )}
                                </PublicField>
                            </div>
                        </Step>

                        <Step number={3} title="Your laundry">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <PublicField
                                    id="book-service_id"
                                    label="Service"
                                    description="Not sure? Leave it — we’ll sort it at the shop."
                                    error={errors.service_id}
                                >
                                    {(aria) => (
                                        <Select
                                            value={data.service_id || undefined}
                                            onValueChange={chooseService}
                                        >
                                            <SelectTrigger
                                                {...aria}
                                                className="h-11! w-full text-base"
                                            >
                                                <SelectValue placeholder="Select a service" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NO_SERVICE}>
                                                    Not sure yet
                                                </SelectItem>
                                                {services.map((entry) => (
                                                    <SelectItem
                                                        key={entry.id}
                                                        value={String(entry.id)}
                                                    >
                                                        {entry.name} ·{' '}
                                                        {peso(
                                                            entry.price,
                                                            symbol,
                                                        )}
                                                        /{entry.unit_short}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </PublicField>
                                <PublicField
                                    id="book-estimated_quantity"
                                    label={
                                        perKg
                                            ? 'Estimated weight (kg)'
                                            : 'Number of pieces'
                                    }
                                    optional
                                    description={
                                        perKg
                                            ? 'A full laundry bag is usually 5–7 kg.'
                                            : undefined
                                    }
                                    error={errors.estimated_quantity}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="estimated_quantity"
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            max={200}
                                            step={perKg ? 0.5 : 1}
                                            value={data.estimated_quantity}
                                            onChange={(event) =>
                                                setData(
                                                    'estimated_quantity',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder={perKg ? '6' : '2'}
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {expressAllowed && (
                                    <CheckboxCard
                                        id="book-is_express"
                                        checked={data.is_express}
                                        onChange={(checked) =>
                                            setData('is_express', checked)
                                        }
                                        label={`Express (+${pricing.express_surcharge_percent}%)`}
                                        description={
                                            expressHours
                                                ? `Ready in as little as ${expressHours} hours.`
                                                : 'Faster turnaround for urgent loads.'
                                        }
                                    />
                                )}
                                <CheckboxCard
                                    id="book-wants_delivery"
                                    checked={data.wants_delivery}
                                    onChange={(checked) =>
                                        setData('wants_delivery', checked)
                                    }
                                    label="Deliver it back to me"
                                    description={`+${peso(pricing.delivery_fee_per_trip, symbol)} per trip. Untick to pick it up at the shop.`}
                                />
                            </div>

                            <PublicField
                                id="book-special_instructions"
                                label="Special instructions"
                                optional
                                error={errors.special_instructions}
                            >
                                {(aria) => (
                                    <Textarea
                                        {...aria}
                                        name="special_instructions"
                                        rows={3}
                                        value={data.special_instructions}
                                        onChange={(event) =>
                                            setData(
                                                'special_instructions',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. separate the whites, no fabric softener, call when outside"
                                        className="text-base"
                                    />
                                )}
                            </PublicField>
                        </Step>

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="book-consent"
                                        checked={data.consent}
                                        onCheckedChange={(checked) =>
                                            setData('consent', checked === true)
                                        }
                                        aria-invalid={
                                            errors.consent ? true : undefined
                                        }
                                        aria-describedby={
                                            errors.consent
                                                ? 'book-consent-error'
                                                : undefined
                                        }
                                        className="mt-0.5 size-5"
                                    />
                                    <Label
                                        htmlFor="book-consent"
                                        className="block text-base leading-snug font-normal"
                                    >
                                        I agree that {site.name} may use my
                                        details to arrange this pickup. Read our{' '}
                                        <a
                                            href={privacy.url()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            Privacy Notice
                                        </a>
                                        .
                                    </Label>
                                </div>
                                {errors.consent && (
                                    <p
                                        id="book-consent-error"
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {errors.consent}
                                    </p>
                                )}
                            </div>

                            {/* Phones: the summary sits in the sidebar column below, so repeat the total here. */}
                            {total && service && (
                                <div className="rounded-xl border bg-fresh-soft p-4 lg:hidden">
                                    <EstimateTotal
                                        estimate={total}
                                        service={service}
                                        symbol={symbol}
                                        compact
                                    />
                                </div>
                            )}

                            <Button
                                type="submit"
                                size="lg"
                                className="h-12 w-full text-base sm:w-auto sm:justify-self-start sm:px-10"
                                disabled={form.processing}
                            >
                                {form.processing && <Spinner />}
                                Request Pickup
                            </Button>
                        </div>
                    </div>

                    <BookingSummary
                        className="lg:sticky lg:top-24"
                        summary={{
                            date: data.pickup_date,
                            window: slot?.window ?? null,
                            service,
                            quantity,
                            express: data.is_express && expressAllowed,
                            delivery: data.wants_delivery,
                            estimate: total,
                            symbol,
                        }}
                    />
                </form>
            </Section>

            <BookingConfirmationDialog
                booking={confirmation}
                onClose={() => setDismissed(booking?.reference ?? null)}
            />
        </>
    );
}

function Step({
    number,
    title,
    children,
}: {
    number: number;
    title: string;
    children: ReactNode;
}) {
    return (
        <Card className="rounded-2xl shadow-sm">
            <CardContent className="grid gap-5 pt-6">
                <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                    <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground"
                    >
                        {number}
                    </span>
                    <span>
                        <span className="sr-only">Step {number}: </span>
                        {title}
                    </span>
                </h2>
                {children}
            </CardContent>
        </Card>
    );
}

function CheckboxCard({
    id,
    checked,
    onChange,
    label,
    description,
}: {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description: string;
}) {
    return (
        <Label
            htmlFor={id}
            className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 font-normal transition-colors hover:border-primary/50 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
        >
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onChange(value === true)}
                aria-describedby={`${id}-description`}
                className="mt-0.5 size-5"
            />
            <span className="grid gap-1">
                <span className="text-base font-medium">{label}</span>
                <span
                    id={`${id}-description`}
                    className="text-sm text-muted-foreground"
                >
                    {description}
                </span>
            </span>
        </Label>
    );
}

/** A string page prop from the redirect response, else the current value. */
function stringProp(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}
