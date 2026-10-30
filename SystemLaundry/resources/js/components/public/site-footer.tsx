import { Link, usePage } from '@inertiajs/react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { AppearanceToggle } from '@/components/appearance-toggle';
import { SocialLinks } from '@/components/public/info-bar';
import { Container } from '@/components/public/section';
import { SiteLogo } from '@/components/public/site-logo';
import { Separator } from '@/components/ui/separator';
import {
    displayPhone,
    hoursLines,
    shortCity,
    telHref,
} from '@/lib/public-site';
import { login, register } from '@/routes';
import {
    about,
    book,
    contact,
    faq,
    pricing,
    privacy,
    track,
} from '@/routes/public';

const columns = [
    {
        title: 'Services',
        links: [
            { title: 'Services & Pricing', href: pricing() },
            { title: 'Book a Pickup', href: book() },
            { title: 'Track Order', href: track() },
            { title: 'Create an account', href: register() },
        ],
    },
    {
        title: 'Company',
        links: [
            { title: 'About Us', href: about() },
            { title: 'FAQ', href: faq() },
            { title: 'Contact', href: contact() },
            { title: 'Privacy Notice', href: privacy() },
        ],
    },
];

/**
 * Footer: brand, quick links, visit details, social links and the discreet Staff login
 * (docs/public-site/04 §2.4).
 */
export function SiteFooter() {
    const { site } = usePage().props;
    const city = shortCity(site.city);

    return (
        <footer className="border-t bg-muted/40">
            <Container className="grid gap-10 py-12 md:grid-cols-2 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
                <div className="flex flex-col gap-4">
                    <SiteLogo />
                    <p className="max-w-xs text-sm text-muted-foreground">
                        Neighborhood laundry with pickup & delivery, SMS updates
                        and online order tracking
                        {city ? ` in ${city}` : ''}.
                    </p>
                    <SocialLinks iconClassName="size-5" />
                </div>

                <div className="grid grid-cols-2 gap-8 md:col-span-1 lg:contents">
                    {columns.map((column) => (
                        <nav key={column.title} aria-label={column.title}>
                            <h2 className="text-sm font-semibold">
                                {column.title}
                            </h2>
                            <ul className="mt-4 grid gap-3 text-sm">
                                {column.links.map((link) => (
                                    <li key={link.title}>
                                        <Link
                                            href={link.href}
                                            className="text-muted-foreground transition-colors hover:text-primary"
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <div>
                    <h2 className="text-sm font-semibold">Visit us</h2>
                    <address className="mt-4 grid gap-3 text-sm text-muted-foreground not-italic">
                        {site.address && (
                            <p className="flex gap-2">
                                <MapPin
                                    className="mt-0.5 size-4 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                {site.map_link ? (
                                    <a
                                        href={site.map_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:text-primary"
                                    >
                                        {site.address}
                                        {city && <>, {city}</>}
                                    </a>
                                ) : (
                                    <span>
                                        {site.address}
                                        {city && <>, {city}</>}
                                    </span>
                                )}
                            </p>
                        )}
                        {site.hours && (
                            <p className="flex gap-2">
                                <Clock
                                    className="mt-0.5 size-4 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                <span className="grid gap-0.5">
                                    {hoursLines(site.hours).map((line) => (
                                        <span key={line}>{line}</span>
                                    ))}
                                </span>
                            </p>
                        )}
                        {site.phone && (
                            <a
                                href={telHref(site.phone)}
                                className="flex gap-2 hover:text-primary"
                            >
                                <Phone
                                    className="mt-0.5 size-4 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                {displayPhone(site.phone)}
                            </a>
                        )}
                        {site.email && (
                            <a
                                href={`mailto:${site.email}`}
                                className="flex gap-2 break-all hover:text-primary"
                            >
                                <Mail
                                    className="mt-0.5 size-4 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                {site.email}
                            </a>
                        )}
                    </address>
                </div>
            </Container>

            <Separator />

            <Container className="flex flex-col-reverse items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
                <p>
                    © {new Date().getFullYear()} {site.name}. All rights
                    reserved.
                </p>
                <div className="flex items-center gap-3">
                    <AppearanceToggle />
                    <span aria-hidden>·</span>
                    <Link
                        href={login({ query: { staff: 1 } })}
                        className="hover:text-foreground hover:underline"
                    >
                        Staff login
                    </Link>
                </div>
            </Container>
        </footer>
    );
}
