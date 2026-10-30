import { Link, usePage } from '@inertiajs/react';
import { MessageCircle, Phone, Search, Send } from 'lucide-react';
import { useState } from 'react';
import { CtaBanner } from '@/components/public/cta-banner';
import { FaqList } from '@/components/public/faq-list';
import { PageHero } from '@/components/public/page-hero';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { telHref } from '@/lib/public-site';
import { contact } from '@/routes/public';
import type { PublicFaq, Seo } from '@/types/public';

type Props = {
    faqs: PublicFaq[];
    categories: string[];
    seo: Seo;
};

const ALL = 'all';

/**
 * FAQ: search box, a tab per category and Accordion answers (docs/public-site/04 §8).
 * The FAQPage schema for Google is already in the server HTML.
 */
export default function Faq({ faqs, categories, seo }: Props) {
    const [term, setTerm] = useState('');
    const [tab, setTab] = useState(ALL);
    const query = term.trim().toLowerCase();

    const visible = (category: string) =>
        faqs.filter(
            (faq) =>
                (category === ALL || faq.category === category) &&
                (query === '' ||
                    faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query)),
        );

    const renderTab = (category: string) => {
        const matches = visible(category);

        if (matches.length === 0) {
            return (
                <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
                    {query ? (
                        <>
                            No questions match “{term.trim()}”. Try another
                            word, or{' '}
                            <Link
                                href={contact()}
                                className="font-medium text-primary underline-offset-4 hover:underline"
                            >
                                ask us directly
                            </Link>
                            .
                        </>
                    ) : (
                        'No questions here yet.'
                    )}
                </p>
            );
        }

        // "All" without a search: one block per category, in the owner's order.
        if (category === ALL && query === '' && categories.length > 1) {
            return (
                <div className="grid gap-10">
                    {categories.map((name) => {
                        const items = matches.filter(
                            (faq) => faq.category === name,
                        );

                        return items.length > 0 ? (
                            <section
                                key={name}
                                aria-labelledby={`faq-${slug(name)}`}
                            >
                                <h2
                                    id={`faq-${slug(name)}`}
                                    className="mb-4 text-xl font-semibold"
                                >
                                    {name}
                                </h2>
                                <FaqList faqs={items} />
                            </section>
                        ) : null;
                    })}
                </div>
            );
        }

        return <FaqList faqs={matches} />;
    };

    return (
        <>
            <SeoHead seo={seo} />

            <PageHero
                breadcrumb="FAQ"
                eyebrow="FAQ"
                title="Frequently asked questions"
                description="Turnaround times, prices, pickup and delivery, payments and garment care — quick answers to what customers ask most."
            />

            <Section className="pt-10 md:pt-14">
                <div className="mx-auto max-w-3xl">
                    <div className="relative mb-6">
                        <Search
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            type="search"
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="Search questions…"
                            aria-label="Search questions"
                            className="h-12 pl-11 text-base"
                        />
                    </div>

                    <Tabs value={tab} onValueChange={setTab} className="gap-6">
                        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                            <TabsList className="h-11 w-max">
                                {[ALL, ...categories].map((category) => (
                                    <TabsTrigger
                                        key={category}
                                        value={category}
                                        className="px-4 text-base"
                                    >
                                        {category === ALL ? 'All' : category}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        {[ALL, ...categories].map((category) => (
                            <TabsContent
                                key={category}
                                value={category}
                                aria-live="polite"
                            >
                                {renderTab(category)}
                            </TabsContent>
                        ))}
                    </Tabs>

                    <StillHaveAQuestion />
                </div>
            </Section>

            <CtaBanner />
        </>
    );
}

function slug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Closing card: Messenger, contact form or phone. */
function StillHaveAQuestion() {
    const { site } = usePage().props;

    return (
        <section
            aria-labelledby="still-question-title"
            className="mt-12 rounded-2xl border bg-fresh-soft p-6 text-center sm:p-8"
        >
            <h2 id="still-question-title" className="text-xl font-semibold">
                Still have a question?
            </h2>
            <p className="mt-2 text-muted-foreground">
                Messenger is the fastest way to reach us during shop hours.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                {site.messenger_url && (
                    <Button asChild className="h-11">
                        <a
                            href={site.messenger_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <MessageCircle aria-hidden />
                            Message us on Messenger
                        </a>
                    </Button>
                )}
                <Button
                    asChild
                    variant={site.messenger_url ? 'outline' : 'default'}
                    className="h-11"
                >
                    <Link href={contact()}>
                        <Send aria-hidden />
                        Send a Message
                    </Link>
                </Button>
                {site.phone && (
                    <Button asChild variant="outline" className="h-11">
                        <a href={telHref(site.phone)}>
                            <Phone aria-hidden />
                            Call Us
                        </a>
                    </Button>
                )}
            </div>
        </section>
    );
}
