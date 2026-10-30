import { Link } from '@inertiajs/react';
import { Calculator } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { estimate, peso, unitWord } from '@/lib/public-site';
import { book } from '@/routes/public';
import type { Service } from '@/types/models';
import type { PricingRules } from '@/types/public';

/** A typical load: 5 kg for per-kilo services, 1 piece otherwise (never below the minimum). */
function defaultQuantity(service: Service | undefined): number {
    if (!service) {
        return 1;
    }

    return Math.max(
        service.pricing_unit === 'per_kg' ? 5 : 1,
        service.min_quantity,
    );
}

/**
 * "Estimate your cost" card on the Pricing page. Same math as the server (estimate()),
 * clearly labeled as an estimate. "Book a Pickup" carries the choice to /book.
 */
export function PriceEstimator({
    services,
    rules,
}: {
    services: Service[];
    rules: PricingRules;
}) {
    const initial =
        services.find((service) => service.code === 'WDF') ?? services[0];
    const [serviceId, setServiceId] = useState(
        initial ? String(initial.id) : '',
    );
    const [quantity, setQuantity] = useState(String(defaultQuantity(initial)));
    const [express, setExpress] = useState(false);
    const [delivery, setDelivery] = useState(false);

    const service = services.find((item) => String(item.id) === serviceId);
    const amount = Number(quantity);
    const result = estimate(service, amount, {
        express,
        trips: delivery ? 2 : 0,
        rules,
    });
    const symbol = rules.currency_symbol;
    const isKg = service?.pricing_unit === 'per_kg';

    const chooseService = (value: string) => {
        const next = services.find((item) => String(item.id) === value);

        setServiceId(value);
        setQuantity(String(defaultQuantity(next)));

        if (!next?.offers_express) {
            setExpress(false);
        }
    };

    if (!service) {
        return null;
    }

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="size-5 text-fresh" aria-hidden />
                    Estimate your cost
                </CardTitle>
                <CardDescription>
                    Pick a service and an amount to see a price.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
                <Field>
                    <FieldLabel htmlFor="estimate-service">Service</FieldLabel>
                    <Select value={serviceId} onValueChange={chooseService}>
                        <SelectTrigger
                            id="estimate-service"
                            className="h-11 w-full text-base"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {services.map((item) => (
                                <SelectItem
                                    key={item.id}
                                    value={String(item.id)}
                                >
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="estimate-quantity">
                        {isKg ? 'Weight (kg)' : 'Pieces'}
                    </FieldLabel>
                    <Input
                        id="estimate-quantity"
                        type="number"
                        inputMode="decimal"
                        min={isKg ? 0.5 : 1}
                        step={isKg ? 0.5 : 1}
                        max={200}
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        className="h-11 text-base"
                    />
                </Field>

                <div className="grid gap-3">
                    {service.offers_express && (
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="estimate-express"
                                checked={express}
                                onCheckedChange={(checked) =>
                                    setExpress(checked === true)
                                }
                            />
                            <Label
                                htmlFor="estimate-express"
                                className="text-base font-normal"
                            >
                                Express (+{rules.express_surcharge_percent}%)
                            </Label>
                        </div>
                    )}
                    {rules.delivery_fee_per_trip > 0 && (
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="estimate-delivery"
                                checked={delivery}
                                onCheckedChange={(checked) =>
                                    setDelivery(checked === true)
                                }
                            />
                            <Label
                                htmlFor="estimate-delivery"
                                className="text-base font-normal"
                            >
                                Pickup & delivery (+
                                {peso(rules.delivery_fee_per_trip * 2, symbol)})
                            </Label>
                        </div>
                    )}
                </div>

                <Separator />

                <div aria-live="polite" className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="font-medium">Estimated total</span>
                        <span className="text-2xl font-semibold tabular-nums">
                            {result ? peso(result.total, symbol) : '—'}
                        </span>
                    </div>
                    {result && result.chargedQuantity > amount && (
                        <p className="text-sm text-muted-foreground">
                            Charged at the {result.chargedQuantity}{' '}
                            {unitWord(service.pricing_unit)} minimum.
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Final price is based on the actual weight or piece count
                        at the shop.
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="h-11 w-full text-base">
                    <Link
                        href={book({
                            query: {
                                service: service.id,
                                qty: amount > 0 ? amount : undefined,
                            },
                        })}
                    >
                        Book a Pickup
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
