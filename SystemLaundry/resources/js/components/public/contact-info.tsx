import { usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { OpenStatus } from '@/components/public/open-status';
import { Button } from '@/components/ui/button';
import {
    displayPhone,
    hoursLines,
    shortCity,
    telHref,
} from '@/lib/public-site';

/**
 * Visit / call / email / hours / Messenger cards beside the contact form.
 */
export function ContactInfo() {
    const { site } = usePage().props;
    const city = shortCity(site.city);

    return (
        <div className="grid gap-4">
            {site.address && (
                <InfoCard icon={MapPin} title="Visit us">
                    <p>
                        {site.address}
                        {city && `, ${city}`}
                    </p>
                    {site.map_link && (
                        <a
                            href={site.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                        >
                            Get directions
                            <ArrowRight className="size-4" aria-hidden />
                        </a>
                    )}
                </InfoCard>
            )}
            {site.phone && (
                <InfoCard icon={Phone} title="Call or text">
                    <a
                        href={telHref(site.phone)}
                        className="font-medium text-foreground hover:text-primary"
                    >
                        {displayPhone(site.phone)}
                    </a>
                </InfoCard>
            )}
            {site.email && (
                <InfoCard icon={Mail} title="Email">
                    <a
                        href={`mailto:${site.email}`}
                        className="font-medium break-all text-foreground hover:text-primary"
                    >
                        {site.email}
                    </a>
                </InfoCard>
            )}
            {site.hours && (
                <InfoCard icon={Clock} title="Opening hours">
                    <OpenStatus className="text-sm" />
                    <span className="grid gap-0.5">
                        {hoursLines(site.hours).map((line) => (
                            <span key={line}>{line}</span>
                        ))}
                    </span>
                </InfoCard>
            )}
            {site.messenger_url && (
                <Button
                    asChild
                    variant="outline"
                    className="h-11 justify-start"
                >
                    <a
                        href={site.messenger_url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <MessageCircle className="text-fresh" aria-hidden />
                        Message us on Messenger
                    </a>
                </Button>
            )}
        </div>
    );
}

function InfoCard({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex gap-4 rounded-2xl border bg-card p-4 shadow-sm">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-fresh/10 text-fresh">
                <Icon className="size-5" aria-hidden />
            </span>
            <div className="grid gap-1 text-base text-muted-foreground">
                <h2 className="text-base font-semibold text-foreground">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
}
