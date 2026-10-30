import { BadgePercent, Scale, Truck, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CtaBanner } from '@/components/public/cta-banner';
import { PageHero } from '@/components/public/page-hero';
import { PriceEstimator } from '@/components/public/price-estimator';
import { Reveal } from '@/components/public/reveal';
import { Section } from '@/components/public/section';
import { SectionHeader } from '@/components/public/section-header';
import { SeoHead } from '@/components/public/seo-head';
import { IconTile } from '@/components/public/service-card';
import { ServiceRow } from '@/components/public/service-row';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { peso } from '@/lib/public-site';
import type { Service } from '@/types/models';
import type { PricingRules, Seo } from '@/types/public';

type Props = {
    services: Service[];
    pricing: PricingRules;
    seo: Seo;
};

/**
 * Services & Pricing: every active service from the database, a cost estimator and the
 * pricing rules (docs/public-site/04 §4).
 */
export default function Pricing({ services, pricing, seo }: Props) {
    const symbol = pricing.currency_symbol;
    const expressHours = services
        .filter((service) => service.offers_express)
        .map((service) => service.express_turnaround_hours ?? 0)
        .filter((hours) => hours > 0);
    const fastestExpress = expressHours.length
        ? Math.min(...expressHours)
        : null;

    const tabs = [
        { value: 'all', label: 'All', items: services },
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
    ].filter((tab) => tab.items.length > 0);

    const notes: { icon: LucideIcon; title: string; text: string }[] = [
        {
            icon: Scale,
            title: 'Minimum load',
            text: 'Each per-kilo service has a minimum (shown on its row). Smaller loads are charged at the minimum.',
        },
        ...(pricing.express_surcharge_percent > 0 && fastestExpress
            ? [
                  {
                      icon: Zap,
                      title: 'Express service',
                      text: `Need it fast? Express adds ${pricing.express_surcharge_percent}% and gets most orders back in ${fastestExpress} hours.`,
                  },
              ]
            : []),
        {
            icon: Truck,
            title: 'Pickup & delivery',
            text:
                pricing.delivery_fee_per_trip > 0
                    ? `${peso(pricing.delivery_fee_per_trip, symbol)} per trip within our service area. Drop-off and pick-up at the shop are always free.`
                    : 'Free within our service area. Drop-off and pick-up at the shop are free too.',
        },
        {
            icon: BadgePercent,
            title: 'Discounts',
            text: 'Senior citizens and PWDs get 20% off with a valid ID.',
        },
    ];

    return (
        <>
            <SeoHead seo={seo} />

            <PageHero
                breadcrumb="Services & Pricing"
                title="Simple, honest pricing"
                description="Per kilo for everyday laundry, per piece for special items. Prices are always up to date — what you see is what you pay."
            />

            <Section labelledBy="price-list-title" className="pt-10 md:pt-14">
                <h2 id="price-list-title" className="sr-only">
                    Price list
                </h2>
                <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
                    {tabs.length > 0 ? (
                        <Tabs defaultValue="all" className="gap-6">
                            <TabsList className="h-11">
                                {tabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="px-4 text-base"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {tabs.map((tab) => (
                                <TabsContent key={tab.value} value={tab.value}>
                                    <ul className="grid gap-4">
                                        {tab.items.map((service) => (
                                            <ServiceRow
                                                key={service.id}
                                                service={service}
                                                currencySymbol={symbol}
                                            />
                                        ))}
                                    </ul>
                                </TabsContent>
                            ))}
                        </Tabs>
                    ) : (
                        <p className="text-muted-foreground">
                            Our price list is being updated. Please call us for
                            current prices.
                        </p>
                    )}

                    <aside
                        aria-label="Cost estimator"
                        className="lg:sticky lg:top-24"
                    >
                        <PriceEstimator services={services} rules={pricing} />
                    </aside>
                </div>
            </Section>

            <Section tone="tint" labelledBy="good-to-know-title">
                <SectionHeader
                    id="good-to-know-title"
                    align="left"
                    eyebrow="Before you book"
                    title="Good to know"
                />
                <ul className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
                    {notes.map((note, index) => (
                        <li key={note.title}>
                            <Reveal
                                delay={index * 60}
                                className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm"
                            >
                                <IconTile icon={note.icon} />
                                <h3 className="text-lg font-semibold">
                                    {note.title}
                                </h3>
                                <p className="text-pretty text-muted-foreground">
                                    {note.text}
                                </p>
                            </Reveal>
                        </li>
                    ))}
                </ul>
            </Section>

            <CtaBanner />
        </>
    );
}
