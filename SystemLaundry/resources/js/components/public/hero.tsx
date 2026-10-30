import { Link, usePage } from '@inertiajs/react';
import { CircleCheck, Star } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Container } from '@/components/public/section';
import { SiteImage } from '@/components/public/site-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { peso, shortCity } from '@/lib/public-site';
import { book } from '@/routes/public';
import type { PublicStats } from '@/types/public';

/**
 * Home hero: eyebrow, the page's H1, live price lead, two CTAs, quick facts and the shop
 * photo with a sample "ready" SMS floating over it (docs/public-site/04 §3.2).
 */
export function Hero({
    wdfPrice,
    regularHours,
    stats,
}: {
    /** Wash, Dry & Fold price per kg, if that service is active. */
    wdfPrice: number | null;
    /** Fastest regular turnaround of the per-kilo services. */
    regularHours: number | null;
    stats: PublicStats;
}) {
    const { site } = usePage().props;
    const city = shortCity(site.city);
    const showRating =
        stats.reviews_count >= 5 && stats.average_rating !== null;

    const facts = [
        regularHours ? `Ready in ${regularHours} hours` : null,
        stats.fastest_express_hours
            ? `Express in ${stats.fastest_express_hours} hours`
            : null,
        'Free SMS updates',
    ].filter((fact): fact is string => fact !== null);

    return (
        <section
            aria-labelledby="hero-title"
            className="relative isolate overflow-hidden bg-linear-to-b from-fresh-soft via-background to-background pt-10 pb-24 md:pt-16 md:pb-32"
        >
            <div
                aria-hidden
                className="absolute -top-32 -right-24 -z-10 size-[28rem] rounded-full bg-fresh/20 blur-3xl"
            />
            <div
                aria-hidden
                className="absolute top-40 -left-40 -z-10 size-96 rounded-full bg-primary/10 blur-3xl"
            />

            <Container className="grid items-center gap-12 lg:grid-cols-12">
                <div className="flex flex-col items-start gap-6 lg:col-span-7">
                    {city && (
                        <Badge
                            variant="outline"
                            className="gap-2 rounded-full bg-background/70 px-3 py-1 text-sm font-medium"
                        >
                            <span
                                aria-hidden
                                className="size-2 rounded-full bg-fresh"
                            />
                            Pickup & delivery in {city}
                        </Badge>
                    )}

                    <h1
                        id="hero-title"
                        className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
                    >
                        Fresh laundry, picked up and delivered.
                    </h1>

                    <p className="max-w-2xl text-lg text-pretty text-muted-foreground md:text-xl">
                        {wdfPrice !== null &&
                            `Wash, dry & fold from ${peso(wdfPrice, site.currency_symbol)}/kg. `}
                        Book a pickup in under a minute, get an SMS at every
                        step, and track your order any time — no account needed.
                    </p>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <Button
                            asChild
                            size="lg"
                            className="h-12 px-6 text-base"
                        >
                            <Link href={book()}>Book a Pickup</Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="h-12 bg-background/70 px-6 text-base"
                        >
                            <a href="#quick-tracker">Track My Order</a>
                        </Button>
                    </div>

                    <ul className="grid gap-2 text-base sm:flex sm:flex-wrap sm:gap-x-6">
                        {facts.map((fact) => (
                            <li key={fact} className="flex items-center gap-2">
                                <CircleCheck
                                    className="size-5 text-fresh"
                                    aria-hidden
                                />
                                {fact}
                            </li>
                        ))}
                    </ul>

                    {showRating && (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star
                                className="size-4 fill-current text-fresh"
                                aria-hidden
                            />
                            <span>
                                <span className="font-semibold text-foreground">
                                    {stats.average_rating?.toFixed(1)}
                                </span>{' '}
                                average from {stats.reviews_count} customer
                                reviews
                            </span>
                        </p>
                    )}
                </div>

                <div className="relative lg:col-span-5">
                    <SiteImage
                        name="hero"
                        priority
                        alt={`Freshly folded laundry ready for pickup at ${site.name ?? 'our shop'}`}
                        className="shadow-lg"
                    />
                    {/* Sample of the SMS customers receive (decorative). */}
                    <div
                        aria-hidden
                        className="absolute -bottom-6 -left-6 hidden max-w-[17rem] gap-3 rounded-2xl border bg-background/95 p-4 text-sm shadow-lg backdrop-blur sm:flex"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-5 fill-current" />
                        </span>
                        <p className="leading-snug">
                            Hi Maria! Your laundry{' '}
                            <span className="font-mono text-xs">
                                LND-20261023-0042
                            </span>{' '}
                            is ready for pickup. — {site.name}
                        </p>
                    </div>
                </div>
            </Container>
        </section>
    );
}
