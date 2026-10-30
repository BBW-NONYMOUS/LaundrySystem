import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    CalendarCheck,
    MapPin,
    MessageSquareText,
    PackageCheck,
    ShieldCheck,
    Tag,
    Truck,
    Wallet,
    WashingMachine,
} from 'lucide-react';
import { CtaBanner } from '@/components/public/cta-banner';
import { FaqList } from '@/components/public/faq-list';
import { FeatureCard } from '@/components/public/feature-card';
import { Hero } from '@/components/public/hero';
import { PricingPreview } from '@/components/public/pricing-preview';
import { QuickTracker } from '@/components/public/quick-tracker';
import { Reveal } from '@/components/public/reveal';
import { Container, Section } from '@/components/public/section';
import { SectionHeader } from '@/components/public/section-header';
import { SeoHead } from '@/components/public/seo-head';
import { ServiceCard } from '@/components/public/service-card';
import { SiteImage } from '@/components/public/site-image';
import { StepCard } from '@/components/public/step-card';
import { TestimonialCarousel } from '@/components/public/testimonial-carousel';
import { TrustBar } from '@/components/public/trust-bar';
import { Button } from '@/components/ui/button';
import {
    displayPhone,
    serviceAreaShort,
    serviceGroups,
    shortCity,
    telHref,
} from '@/lib/public-site';
import { book, faq, pricing as pricingPage } from '@/routes/public';
import type { Service } from '@/types/models';
import type {
    PricingRules,
    PublicFaq,
    PublicStats,
    PublicTestimonial,
    Seo,
} from '@/types/public';

type Props = {
    services: Service[];
    pricing: PricingRules;
    stats: PublicStats;
    testimonials: PublicTestimonial[];
    faqs: PublicFaq[];
    seo: Seo;
};

const steps = [
    {
        icon: CalendarCheck,
        title: 'Book',
        text: 'Book online or call us. Pick a date and a time slot that suits you.',
    },
    {
        icon: Truck,
        title: 'We pick up',
        text: 'Our rider collects your laundry at your door and tags every bag.',
    },
    {
        icon: WashingMachine,
        title: 'We clean',
        text: 'Sorted by color and fabric, then washed, dried and folded. You get an SMS at every step.',
    },
    {
        icon: PackageCheck,
        title: 'We deliver',
        text: 'Fresh, folded laundry back at your door. Pay with cash, GCash or Maya.',
    },
];

/**
 * Public Home page: the 12 sections of docs/public-site/04 §3 (navbar and footer come
 * from PublicSiteLayout).
 */
export default function Home({
    services,
    pricing,
    stats,
    testimonials,
    faqs,
    seo,
}: Props) {
    const { site } = usePage().props;
    const city = shortCity(site.city);
    const area = serviceAreaShort(site.service_area);
    const wdf = services.find((service) => service.code === 'WDF');
    const perKiloHours = services
        .filter((service) => service.pricing_unit === 'per_kg')
        .map((service) => service.turnaround_hours);
    const regularHours =
        wdf?.turnaround_hours ??
        (perKiloHours.length ? Math.min(...perKiloHours) : null);
    const groups = serviceGroups(
        services,
        pricing,
        stats.fastest_express_hours,
    );

    const features = [
        {
            icon: MapPin,
            title: 'Real-time tracking',
            text: 'Follow your order from washer to doorstep with your order number. No app, no account.',
        },
        {
            icon: MessageSquareText,
            title: 'SMS at every step',
            text: 'We text you when we receive your laundry, when it’s ready and when the rider is on the way.',
        },
        {
            icon: Truck,
            title: 'Pickup & delivery',
            text: area
                ? `Door-to-door ${area}, in three time slots every day.`
                : 'Door-to-door, in three time slots every day.',
        },
        {
            icon: Wallet,
            title: 'Pay with GCash or Maya',
            text: 'Or cash, bank transfer or card — at the counter or to our rider.',
        },
        {
            icon: Tag,
            title: 'Tagged and counted',
            text: 'Every bag gets a QR tag and a piece count, so nothing gets lost or mixed up.',
        },
        {
            icon: ShieldCheck,
            title: 'Careful handling',
            text: 'Whites and colors sorted, fabrics checked, and your special instructions followed.',
        },
    ];

    return (
        <>
            <SeoHead seo={seo} />

            <Hero
                wdfPrice={wdf?.price ?? null}
                regularHours={regularHours}
                stats={stats}
            />

            <QuickTracker />

            {/* Trust bar */}
            <section aria-label="Shop in numbers" className="py-14 md:py-16">
                <Container>
                    <Reveal>
                        <TrustBar stats={stats} city={city} />
                    </Reveal>
                </Container>
            </section>

            {/* Services */}
            {groups.length > 0 && (
                <Section tone="tint" labelledBy="services-title">
                    <SectionHeader
                        id="services-title"
                        eyebrow="Our services"
                        title="Everything your wardrobe needs"
                        description="From everyday clothes to your best barong — priced per kilo or per piece, with no hidden fees."
                    />
                    <ul className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
                        {groups.map((group, index) => (
                            <li key={group.key}>
                                <Reveal delay={index * 60} className="h-full">
                                    <ServiceCard
                                        icon={group.icon}
                                        title={group.title}
                                        description={group.description}
                                        from={group.from}
                                        surchargePercent={
                                            group.surchargePercent
                                        }
                                        currencySymbol={site.currency_symbol}
                                    />
                                </Reveal>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-10 flex justify-center">
                        <Button asChild variant="link" className="text-base">
                            <Link href={pricingPage()}>
                                See full price list
                                <ArrowRight aria-hidden />
                            </Link>
                        </Button>
                    </div>
                </Section>
            )}

            {/* How it works */}
            <Section id="how-it-works" labelledBy="how-title">
                <SectionHeader
                    id="how-title"
                    eyebrow="How it works"
                    title="Clean clothes in four easy steps"
                    description={
                        area
                            ? `No need to leave the house. We pick up, clean and deliver ${area}.`
                            : 'No need to leave the house. We pick up, clean and deliver.'
                    }
                />
                <Reveal>
                    <ol className="mx-auto max-w-md md:grid md:max-w-none md:grid-cols-4 md:gap-6">
                        {steps.map((step, index) => (
                            <StepCard
                                key={step.title}
                                step={index + 1}
                                icon={step.icon}
                                title={step.title}
                                text={step.text}
                                last={index === steps.length - 1}
                            />
                        ))}
                    </ol>
                </Reveal>
                <div className="mt-12 flex flex-col items-center gap-3 text-center">
                    <Button asChild size="lg" className="h-11 px-6 text-base">
                        <Link href={book()}>Book a Pickup</Link>
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Prefer to drop off? Walk in any time during shop hours.
                    </p>
                </div>
            </Section>

            {/* Why choose us */}
            <Section tone="tint" labelledBy="why-title">
                <div className="grid gap-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-16">
                    <SectionHeader
                        id="why-title"
                        align="left"
                        eyebrow={`Why ${site.name ?? 'choose us'}`}
                        title="Laundry you don’t have to worry about"
                        description="We built our shop around one promise: you always know where your clothes are and when they’ll be back."
                        className="mb-0 md:mb-0 lg:col-start-1 lg:row-start-1"
                    />
                    <ul className="order-2 grid gap-8 sm:grid-cols-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
                        {features.map((feature, index) => (
                            <li key={feature.title}>
                                <Reveal delay={index * 60}>
                                    <FeatureCard {...feature} />
                                </Reveal>
                            </li>
                        ))}
                    </ul>
                    <Reveal className="order-3 lg:col-start-1 lg:row-start-2">
                        <SiteImage
                            name="why-us"
                            alt="Staff sorting laundry by color before washing"
                            icon={ShieldCheck}
                            className="mx-auto max-w-md lg:mx-0"
                        />
                    </Reveal>
                </div>
            </Section>

            {/* Pricing preview */}
            <Section labelledBy="pricing-title">
                <SectionHeader
                    id="pricing-title"
                    eyebrow="Pricing"
                    title="Simple, honest prices"
                    description="Pay by the kilo for everyday laundry and by the piece for special items. What you see here is what you pay."
                />
                <PricingPreview
                    services={services}
                    rules={pricing}
                    expressHours={stats.fastest_express_hours}
                />
            </Section>

            {/* Testimonials */}
            {testimonials.length > 0 && (
                <Section tone="tint" labelledBy="reviews-title">
                    <SectionHeader
                        id="reviews-title"
                        eyebrow="Reviews"
                        title="Loved by busy neighbors"
                        description="Real reviews from customers, sent after their order was done."
                    />
                    <TestimonialCarousel testimonials={testimonials} />
                </Section>
            )}

            {/* FAQ preview */}
            {faqs.length > 0 && (
                <Section labelledBy="faq-title">
                    <SectionHeader
                        id="faq-title"
                        eyebrow="FAQ"
                        title="Questions? We’ve got answers."
                    />
                    <div className="mx-auto max-w-3xl">
                        <FaqList faqs={faqs} />
                        <div className="mt-8 flex flex-col items-center gap-2 text-center">
                            <Button
                                asChild
                                variant="link"
                                className="text-base"
                            >
                                <Link href={faq()}>
                                    See all questions
                                    <ArrowRight aria-hidden />
                                </Link>
                            </Button>
                            <StillUnsure />
                        </div>
                    </div>
                </Section>
            )}

            <CtaBanner />
        </>
    );
}

/** "Still unsure? Message us on Messenger" (or call, when Messenger isn't set). */
function StillUnsure() {
    const { site } = usePage().props;

    if (site.messenger_url) {
        return (
            <p className="text-muted-foreground">
                Still unsure?{' '}
                <a
                    href={site.messenger_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                >
                    Message us on Messenger
                </a>
            </p>
        );
    }

    if (site.phone) {
        return (
            <p className="text-muted-foreground">
                Still unsure?{' '}
                <a
                    href={telHref(site.phone)}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                >
                    Call us at {displayPhone(site.phone)}
                </a>
            </p>
        );
    }

    return null;
}
