import { usePage } from '@inertiajs/react';
import { WashingMachine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

/** Photo names and sizes from docs/public-site/04 §16. */
const photos = {
    hero: { width: 1200, height: 900 },
    'why-us': { width: 1000, height: 1000 },
    'shop-front': { width: 1200, height: 900 },
    team: { width: 1200, height: 800 },
} as const;

export type SitePhoto = keyof typeof photos;

/**
 * A shop photo from public/images/site/{name}.webp. Until the owner saves that file, a
 * branded blue-to-aqua panel with a line icon is shown instead, so the page always looks
 * finished and never requests a missing image.
 */
export function SiteImage({
    name,
    alt,
    icon: Icon = WashingMachine,
    priority = false,
    className,
}: {
    name: SitePhoto;
    alt: string;
    icon?: LucideIcon;
    /** The hero image: load immediately instead of lazily. */
    priority?: boolean;
    className?: string;
}) {
    const { site } = usePage().props;
    const { width, height } = photos[name];
    const available = site.images?.includes(name) ?? false;

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border bg-card shadow-sm',
                className,
            )}
        >
            <AspectRatio ratio={width / height}>
                {available ? (
                    <img
                        src={`/images/site/${name}.webp`}
                        alt={alt}
                        width={width}
                        height={height}
                        loading={priority ? 'eager' : 'lazy'}
                        fetchPriority={priority ? 'high' : 'auto'}
                        decoding="async"
                        className="size-full object-cover"
                    />
                ) : (
                    <div
                        aria-hidden
                        className="relative flex size-full items-center justify-center overflow-hidden bg-linear-to-br from-primary/15 via-fresh/10 to-fresh-soft"
                    >
                        <div className="absolute -top-10 -right-10 size-48 rounded-full bg-fresh/20 blur-3xl" />
                        <div className="absolute -bottom-12 -left-8 size-56 rounded-full bg-primary/15 blur-3xl" />
                        <div className="relative flex size-24 items-center justify-center rounded-3xl bg-background/70 text-primary shadow-sm backdrop-blur-sm md:size-28">
                            <Icon
                                className="size-12 md:size-14"
                                strokeWidth={1.5}
                            />
                        </div>
                    </div>
                )}
            </AspectRatio>
        </div>
    );
}
