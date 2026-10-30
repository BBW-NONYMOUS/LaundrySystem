import { usePage } from '@inertiajs/react';
import { Clock, ShieldCheck, Store, Users, Wallet } from 'lucide-react';
import { CtaBanner } from '@/components/public/cta-banner';
import { FeatureCard } from '@/components/public/feature-card';
import { PageHero } from '@/components/public/page-hero';
import { Reveal } from '@/components/public/reveal';
import { Container, Section } from '@/components/public/section';
import { SectionHeader } from '@/components/public/section-header';
import { SeoHead } from '@/components/public/seo-head';
import { SiteImage } from '@/components/public/site-image';
import { TestimonialCard } from '@/components/public/testimonial-card';
import { TrustBar } from '@/components/public/trust-bar';
import { shortCity } from '@/lib/public-site';
import type { PublicStats, PublicTestimonial, Seo } from '@/types/public';

type Props = {
    about: {
        story: string | null;
        founded_year: number | null;
        service_area: string | null;
    };
    stats: PublicStats;
    testimonials: PublicTestimonial[];
    seo: Seo;
};

const values = [
    {
        icon: ShieldCheck,
        title: 'Care you can see',
        text: 'Every load is sorted, checked and handled like it’s our own.',
    },
    {
        icon: Clock,
        title: 'On time, every time',
        text: 'We give you a ready time and we keep it. If anything changes, you’ll hear it from us first.',
    },
    {
        icon: Wallet,
        title: 'Honest pricing',
        text: 'Our full price list is online. No surprise charges at the counter.',
    },
];

const carePoints = [
    {
        title: 'Tagged at drop-off.',
        text: 'Every bag gets a QR tag and a piece count on your receipt.',
    },
    {
        title: 'Sorted before washing.',
        text: 'Whites, colors and delicates never share a machine.',
    },
    {
        title: 'Checked before folding.',
        text: 'We look for stains, loose buttons and anything left in pockets.',
    },
    {
        title: 'Packed and sealed.',
        text: 'Your laundry is folded, bagged and labeled with your order number.',
    },
];

/**
 * About Us: the shop's story (from Settings), real numbers, values and how clothes are
 * handled (docs/public-site/04 §7).
 */
export default function About({ about, stats, testimonials, seo }: Props) {
    const { site } = usePage().props;
    const city = shortCity(site.city);
    const shopName = site.name ?? 'our shop';

    return (
        <>
            <SeoHead seo={seo} />

            <PageHero
                breadcrumb="About Us"
                eyebrow="About us"
                title="Clean clothes, less stress"
                description={`We’re a neighborhood laundry${city ? ` in ${city}` : ''}, serving students, families and working professionals${about.founded_year ? ` since ${about.founded_year}` : ''}.`}
            />

            <Section labelledBy="story-title">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <div className="flex flex-col gap-4">
                        <h2
                            id="story-title"
                            className="text-3xl font-semibold tracking-tight md:text-4xl"
                        >
                            Our story
                        </h2>
                        {about.story && (
                            <p className="text-lg leading-8 text-pretty whitespace-pre-line text-muted-foreground">
                                {about.story}
                            </p>
                        )}
                        {about.service_area && (
                            <p className="text-base font-medium">
                                {about.service_area}.
                            </p>
                        )}
                    </div>
                    <Reveal>
                        <SiteImage
                            name="shop-front"
                            icon={Store}
                            alt={`${shopName} storefront${city ? ` in ${city}` : ''}`}
                        />
                    </Reveal>
                </div>
            </Section>

            <section
                aria-label="Shop in numbers"
                className="border-y bg-muted/30 py-12"
            >
                <Container>
                    <TrustBar stats={stats} city={city} />
                </Container>
            </section>

            <Section tone="tint" labelledBy="values-title">
                <SectionHeader id="values-title" title="What we stand for" />
                <ul className="grid gap-6 md:grid-cols-3">
                    {values.map((value, index) => (
                        <li key={value.title}>
                            <Reveal
                                delay={index * 60}
                                className="h-full rounded-2xl border bg-card p-6 shadow-sm"
                            >
                                <FeatureCard {...value} />
                            </Reveal>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section labelledBy="care-title">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <div>
                        <SectionHeader
                            id="care-title"
                            align="left"
                            title="How we look after your clothes"
                            className="mb-8 md:mb-8"
                        />
                        <ol className="grid gap-6">
                            {carePoints.map((point, index) => (
                                <li key={point.title} className="flex gap-4">
                                    <span
                                        aria-hidden
                                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                                    >
                                        {index + 1}
                                    </span>
                                    <p className="pt-1.5 text-pretty text-muted-foreground">
                                        <span className="font-semibold text-foreground">
                                            {point.title}
                                        </span>{' '}
                                        {point.text}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <Reveal>
                        <SiteImage
                            name="team"
                            icon={Users}
                            alt={`The ${shopName} team`}
                        />
                    </Reveal>
                </div>
            </Section>

            {testimonials.length > 0 && (
                <Section tone="tint" labelledBy="about-reviews-title">
                    <SectionHeader
                        id="about-reviews-title"
                        title="What our customers say"
                    />
                    <ul className="grid gap-6 md:grid-cols-3">
                        {testimonials.map((testimonial) => (
                            <li key={testimonial.id}>
                                <TestimonialCard testimonial={testimonial} />
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <CtaBanner />
        </>
    );
}
