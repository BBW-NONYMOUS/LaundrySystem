import { Link, usePage } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { Reveal } from '@/components/public/reveal';
import { Container } from '@/components/public/section';
import { Button } from '@/components/ui/button';
import { displayPhone, telHref } from '@/lib/public-site';
import { book } from '@/routes/public';

/**
 * "Ready for fresh laundry?" closing banner (Home, Pricing, About, FAQ).
 */
export function CtaBanner({
    title = 'Ready for fresh laundry?',
    text = 'Book a pickup in under a minute. We’ll text you when our rider is on the way.',
}: {
    title?: string;
    text?: string;
}) {
    const { site } = usePage().props;

    return (
        <section aria-labelledby="cta-title" className="py-16 md:py-24">
            <Container>
                <Reveal>
                    <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground shadow-lg sm:px-12 md:py-16">
                        <div
                            aria-hidden
                            className="absolute -top-20 -right-16 -z-10 size-72 rounded-full bg-fresh/40 blur-3xl"
                        />
                        <div
                            aria-hidden
                            className="absolute -bottom-24 -left-10 -z-10 size-64 rounded-full bg-white/10 blur-3xl"
                        />
                        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="max-w-xl">
                                <h2
                                    id="cta-title"
                                    className="text-3xl font-semibold tracking-tight text-balance md:text-4xl"
                                >
                                    {title}
                                </h2>
                                <p className="mt-3 text-lg text-primary-foreground/85">
                                    {text}
                                </p>
                            </div>
                            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:shrink-0">
                                <Button
                                    asChild
                                    size="lg"
                                    variant="secondary"
                                    className="h-12 px-6 text-base"
                                >
                                    <Link href={book()}>Book a Pickup</Link>
                                </Button>
                                {site.phone && (
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="h-12 px-6 text-base text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                                    >
                                        <a href={telHref(site.phone)}>
                                            <Phone aria-hidden />
                                            Call {displayPhone(site.phone)}
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </Reveal>
            </Container>
        </section>
    );
}
