import { Link } from '@inertiajs/react';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { peso, unitWord } from '@/lib/public-site';
import { pricing as pricingPage } from '@/routes/public';
import type { Service } from '@/types/models';
import type { PricingRules } from '@/types/public';

/** The "Good to know" notes shared by the Home preview. */
export function pricingNotes(
    services: Service[],
    rules: PricingRules,
    expressHours: number | null,
): string[] {
    const wdf = services.find((service) => service.code === 'WDF');
    const symbol = rules.currency_symbol;

    return [
        wdf ? `Minimum ${wdf.min_quantity} kg for wash, dry & fold` : null,
        rules.express_surcharge_percent > 0 && expressHours
            ? `Express: +${rules.express_surcharge_percent}%, ready in as little as ${expressHours} hours`
            : null,
        rules.delivery_fee_per_trip > 0
            ? `Pickup & delivery: ${peso(rules.delivery_fee_per_trip, symbol)} per trip`
            : 'Free pickup & delivery',
        'Senior citizens and PWDs: 20% off with a valid ID',
    ].filter((note): note is string => note !== null);
}

/**
 * Home pricing preview: Per kilo / Per piece tabs (first five each) and a notes card.
 */
export function PricingPreview({
    services,
    rules,
    expressHours,
}: {
    services: Service[];
    rules: PricingRules;
    expressHours: number | null;
}) {
    const groups = [
        {
            value: 'per_kg',
            label: 'Per kilo',
            items: services.filter(
                (service) => service.pricing_unit === 'per_kg',
            ),
        },
        {
            value: 'per_item',
            label: 'Per piece',
            items: services.filter(
                (service) => service.pricing_unit === 'per_item',
            ),
        },
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                <Tabs defaultValue={groups[0].value} className="gap-4">
                    <TabsList className="h-11">
                        {groups.map((group) => (
                            <TabsTrigger
                                key={group.value}
                                value={group.value}
                                className="px-4 text-base"
                            >
                                {group.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {groups.map((group) => (
                        <TabsContent key={group.value} value={group.value}>
                            <ul className="divide-y rounded-2xl border bg-card shadow-sm">
                                {group.items.slice(0, 5).map((service) => (
                                    <li
                                        key={service.id}
                                        className="flex items-baseline justify-between gap-4 px-5 py-4"
                                    >
                                        <span className="font-medium">
                                            {service.name}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                            <span className="font-semibold text-foreground tabular-nums">
                                                {peso(
                                                    service.price,
                                                    rules.currency_symbol,
                                                )}
                                            </span>{' '}
                                            / {unitWord(service.pricing_unit)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </TabsContent>
                    ))}
                </Tabs>

                <Card className="h-fit rounded-2xl bg-fresh-soft shadow-sm lg:mt-15">
                    <CardHeader>
                        <CardTitle className="text-lg">Good to know</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid gap-3">
                            {pricingNotes(services, rules, expressHours).map(
                                (note) => (
                                    <li key={note} className="flex gap-2">
                                        <CircleCheck
                                            className="mt-0.5 size-5 shrink-0 text-fresh"
                                            aria-hidden
                                        />
                                        {note}
                                    </li>
                                ),
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-center">
                <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 px-6"
                >
                    <Link href={pricingPage()}>See All Prices</Link>
                </Button>
            </div>
        </div>
    );
}
