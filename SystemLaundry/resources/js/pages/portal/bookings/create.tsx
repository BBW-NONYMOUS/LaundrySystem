import { Head, useForm } from '@inertiajs/react';
import { Info, Zap } from 'lucide-react';
import type { FormEvent } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { money } from '@/lib/format';
import { store } from '@/routes/portal/bookings';
import type { Customer, Service } from '@/types/models';

type Props = {
    customer: Customer;
    services: Service[];
    pricing: {
        express_surcharge_percent: number;
        delivery_fee_per_trip: number;
        currency_symbol: string;
    };
};

/** Pickup windows offered to customers (same slots the riders use). */
const slots = [
    { value: '09:00', label: '9 AM' },
    { value: '13:00', label: '1 PM' },
    { value: '16:00', label: '4 PM' },
];

/**
 * Book a pickup. No weights or totals here: the shop weighs the laundry on arrival
 * and texts the total.
 */
export default function BookPickup({ customer, services, pricing }: Props) {
    const form = useForm({
        date: '',
        slot: '09:00',
        address: customer.address ?? '',
        contact_phone: customer.phone,
        service_ids: [] as number[],
        is_express: false,
        wants_delivery: true,
        special_instructions: '',
    });
    const { data, setData, processing } = form;
    // scheduled_at is built in transform(), so its error key isn't one of the form fields.
    const errors = form.errors as Record<string, string | undefined>;
    const currency = pricing.currency_symbol;

    const selected = services.filter((service) =>
        data.service_ids.includes(service.id),
    );
    const expressAvailable = selected.every(
        (service) => service.offers_express,
    );

    const toggleService = (id: number, checked: boolean) => {
        setData(
            'service_ids',
            checked
                ? [...data.service_ids, id]
                : data.service_ids.filter((value) => value !== id),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform(({ date, slot, ...rest }) => ({
            ...rest,
            is_express: rest.is_express && expressAvailable,
            scheduled_at: date ? `${date} ${slot}:00` : '',
        }));
        form.post(store.url());
    };

    const trips = data.wants_delivery ? 2 : 1;

    return (
        <>
            <Head title="Book a pickup" />
            <form onSubmit={submit} className="flex flex-col gap-6">
                <PageHeader
                    title="Book a pickup"
                    description="Choose when our rider should collect your laundry."
                />

                <Alert>
                    <Info />
                    <AlertDescription>
                        We'll weigh your laundry at the shop and text you the
                        total. You can pay when we deliver it or when you claim
                        it.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>When and where</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="pickup-date">Pickup date</Label>
                                <DatePicker
                                    id="pickup-date"
                                    value={data.date}
                                    onChange={(value) => setData('date', value)}
                                    disablePast
                                />
                                <InputError message={errors.scheduled_at} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Time</Label>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={data.slot}
                                    onValueChange={(value) =>
                                        value && setData('slot', value)
                                    }
                                    className="w-full"
                                >
                                    {slots.map((slot) => (
                                        <ToggleGroupItem
                                            key={slot.value}
                                            value={slot.value}
                                            className="h-10 flex-1"
                                        >
                                            {slot.label}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Pickup address</Label>
                            <Textarea
                                id="address"
                                value={data.address}
                                onChange={(event) =>
                                    setData('address', event.target.value)
                                }
                                placeholder="House no., street, barangay, city"
                                rows={2}
                                required
                            />
                            <InputError message={errors.address} />
                        </div>

                        <div className="grid gap-2 sm:max-w-xs">
                            <Label htmlFor="contact_phone">Mobile number</Label>
                            <Input
                                id="contact_phone"
                                type="tel"
                                inputMode="tel"
                                value={data.contact_phone}
                                onChange={(event) =>
                                    setData('contact_phone', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.contact_phone} />
                        </div>

                        <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <span className="grid gap-1">
                                <span className="text-sm font-medium">
                                    Deliver it back to me
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    Otherwise you can claim it at the shop.
                                </span>
                            </span>
                            <Switch
                                checked={data.wants_delivery}
                                onCheckedChange={(checked) =>
                                    setData('wants_delivery', checked)
                                }
                            />
                        </label>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>What needs washing?</CardTitle>
                        <CardDescription>
                            Optional — helps us prepare.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {services.map((service) => (
                                <label
                                    key={service.id}
                                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                >
                                    <Checkbox
                                        checked={data.service_ids.includes(
                                            service.id,
                                        )}
                                        onCheckedChange={(checked) =>
                                            toggleService(
                                                service.id,
                                                checked === true,
                                            )
                                        }
                                        className="mt-0.5"
                                    />
                                    <span className="grid gap-0.5">
                                        <span className="text-sm font-medium">
                                            {service.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {money(service.price, currency)} /{' '}
                                            {service.unit_short}
                                            {service.min_quantity > 1
                                                ? ` · min ${service.min_quantity} ${service.unit_short}`
                                                : ''}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.service_ids} />

                        <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
                            <span className="grid gap-1">
                                <span className="flex items-center gap-2 text-sm font-medium">
                                    <Zap className="size-4 text-warning" />{' '}
                                    Express service
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {expressAvailable
                                        ? `Faster turnaround, +${pricing.express_surcharge_percent}% of the laundry charges.`
                                        : 'Not available for one of the services you picked.'}
                                </span>
                            </span>
                            <Switch
                                checked={data.is_express && expressAvailable}
                                disabled={!expressAvailable}
                                onCheckedChange={(checked) =>
                                    setData('is_express', checked)
                                }
                            />
                        </label>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Notes for the shop</Label>
                            <Textarea
                                id="notes"
                                value={data.special_instructions}
                                onChange={(event) =>
                                    setData(
                                        'special_instructions',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. Separate white clothes, unscented softener only"
                                rows={3}
                            />
                            <InputError message={errors.special_instructions} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        Pickup{data.wants_delivery ? ' & delivery' : ''} fee:{' '}
                        <span className="font-medium text-foreground tabular-nums">
                            {money(
                                pricing.delivery_fee_per_trip * trips,
                                currency,
                            )}
                        </span>
                    </p>
                    <Button type="submit" size="lg" disabled={processing}>
                        {processing && <Spinner />}
                        Book pickup
                    </Button>
                </div>
            </form>
        </>
    );
}
