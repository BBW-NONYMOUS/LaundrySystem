import { usePage } from '@inertiajs/react';
import {
    Facebook,
    Instagram,
    MapPin,
    MessageCircle,
    Phone,
} from 'lucide-react';
import { OpenStatus } from '@/components/public/open-status';
import { Container } from '@/components/public/section';
import { displayPhone, shortCity, telHref } from '@/lib/public-site';

/**
 * Thin strip above the navbar (desktop only): open status, city, phone, social links.
 */
export function InfoBar() {
    const { site } = usePage().props;
    const city = shortCity(site.city);

    return (
        <div className="hidden border-b bg-muted/40 text-xs text-muted-foreground md:block">
            <Container className="flex h-9 items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <OpenStatus />
                    {city && (
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" aria-hidden />
                            {city}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {site.phone && (
                        <a
                            href={telHref(site.phone)}
                            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
                        >
                            <Phone className="size-3.5" aria-hidden />
                            {displayPhone(site.phone)}
                        </a>
                    )}
                    <SocialLinks iconClassName="size-3.5" />
                </div>
            </Container>
        </div>
    );
}

/** Facebook / Messenger / Instagram icons; links left empty in Settings are hidden. */
export function SocialLinks({
    className = 'flex items-center gap-3',
    iconClassName = 'size-4',
}: {
    className?: string;
    iconClassName?: string;
}) {
    const { site } = usePage().props;
    const links = [
        {
            href: site.facebook_url,
            label: `${site.name} on Facebook`,
            icon: Facebook,
        },
        {
            href: site.messenger_url,
            label: 'Message us on Messenger',
            icon: MessageCircle,
        },
        {
            href: site.instagram_url,
            label: `${site.name} on Instagram`,
            icon: Instagram,
        },
    ].filter((link) => link.href);

    if (links.length === 0) {
        return null;
    }

    return (
        <div className={className}>
            {links.map(({ href, label, icon: Icon }) => (
                <a
                    key={label}
                    href={href ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <Icon className={iconClassName} aria-hidden />
                </a>
            ))}
        </div>
    );
}
