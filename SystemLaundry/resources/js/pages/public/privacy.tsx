import { usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { PageHero } from '@/components/public/page-hero';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { displayPhone, telHref } from '@/lib/public-site';
import type { Seo } from '@/types/public';

type Props = {
    /** "2026-10-23": changes whenever this text changes. */
    lastUpdated: string;
    /** How long booking requests and messages are kept (model:prune). */
    retentionMonths: number;
    seo: Seo;
};

/**
 * Data Privacy Act of 2012 (RA 10173) notice, linked from the booking and contact
 * consent boxes (docs/public-site/04 §13).
 */
export default function Privacy({ lastUpdated, retentionMonths, seo }: Props) {
    const { site } = usePage().props;
    const shop = site.name ?? 'We';
    const retention =
        retentionMonths === 12 ? 'one year' : `${retentionMonths} months`;

    return (
        <>
            <SeoHead seo={seo} />
            <PageHero
                breadcrumb="Privacy Notice"
                title="Privacy Notice"
                description={`How ${shop} collects, uses and protects your personal information.`}
            />

            <Section className="py-10 md:py-16">
                <article className="grid max-w-3xl gap-8 text-base leading-7">
                    <Part title="What we collect">
                        Your name, mobile number, address and, if you give it,
                        your email. For orders, we also keep what you had
                        cleaned, what you paid and your order status.
                    </Part>
                    <Part title="Why we collect it">
                        To pick up and deliver your laundry, to send you SMS and
                        email updates about your order, to reply to your
                        messages, and to keep accurate business records.
                    </Part>
                    <Part title="Who sees it">
                        Only our staff, and only what they need for their work.
                        Your number is shared with our SMS provider solely to
                        deliver our messages. We never sell or share your
                        information for marketing.
                    </Part>
                    <Part title="On our website">
                        The tracking page shows only your first name and order
                        status. Reviews show only your first name and last
                        initial, and only after we approve them.
                    </Part>
                    <Part title="How long we keep it">
                        Order records are kept for as long as the law requires
                        for business records. Booking requests and messages are
                        deleted after {retention}.
                    </Part>
                    <Part title="Your rights">
                        You can ask to see, correct or delete your personal
                        information at any time.{' '}
                        {site.email || site.phone ? (
                            <>
                                Contact us at{' '}
                                {site.email && (
                                    <a
                                        href={`mailto:${site.email}`}
                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        {site.email}
                                    </a>
                                )}
                                {site.email && site.phone && ' or '}
                                {site.phone && (
                                    <a
                                        href={telHref(site.phone)}
                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        {displayPhone(site.phone)}
                                    </a>
                                )}
                                , or visit the shop.
                            </>
                        ) : (
                            'Visit the shop or message us.'
                        )}
                    </Part>

                    <p className="border-t pt-6 text-sm text-muted-foreground">
                        Last updated:{' '}
                        <time dateTime={lastUpdated}>
                            {format(parseISO(lastUpdated), 'MMMM d, yyyy')}
                        </time>
                    </p>
                </article>
            </Section>
        </>
    );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="grid gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">{children}</p>
        </section>
    );
}
