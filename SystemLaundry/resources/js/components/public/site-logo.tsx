import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

/**
 * The uploaded shop logo, or the washing-machine mark, next to the shop name.
 * Links to Home.
 */
export function SiteLogo({
    className,
    compact = false,
}: {
    className?: string;
    /** Phones: shorten long names so the navbar buttons still fit. */
    compact?: boolean;
}) {
    const { site } = usePage().props;
    const name = site.name ?? 'Laundry';

    return (
        <Link
            href={home()}
            className={cn(
                'flex min-w-0 items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                className,
            )}
        >
            {site.logo_url ? (
                <img
                    src={site.logo_url}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 shrink-0 rounded-lg object-contain"
                />
            ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <AppLogoIcon className="size-6 fill-current" />
                </span>
            )}
            <span
                className={cn(
                    'truncate',
                    compact && 'max-w-[9.5rem] sm:max-w-none',
                )}
            >
                {name}
            </span>
        </Link>
    );
}
