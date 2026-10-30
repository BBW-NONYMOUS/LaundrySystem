import { Link, usePage } from '@inertiajs/react';
import { Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { telHref } from '@/lib/public-site';
import { cn } from '@/lib/utils';
import { book } from '@/routes/public';

/**
 * Phones only: Call + Book a Pickup bar that slides up once the visitor scrolls past the
 * hero (Home and Pricing). The layout adds matching bottom padding so it never covers
 * the footer.
 */
export function MobileActionBar() {
    const { site } = usePage().props;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 480);

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div
            className={cn(
                'fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur transition-transform duration-300 md:hidden',
                visible
                    ? 'translate-y-0'
                    : 'pointer-events-none translate-y-full',
            )}
            aria-hidden={!visible}
        >
            <div className="flex gap-3">
                {site.phone && (
                    <Button
                        asChild
                        variant="outline"
                        size="icon"
                        className="size-12 shrink-0"
                    >
                        <a
                            href={telHref(site.phone)}
                            aria-label="Call us"
                            tabIndex={visible ? undefined : -1}
                        >
                            <Phone />
                        </a>
                    </Button>
                )}
                <Button asChild className="h-12 flex-1 text-base">
                    <Link href={book()} tabIndex={visible ? undefined : -1}>
                        Book a Pickup
                    </Link>
                </Button>
            </div>
        </div>
    );
}
