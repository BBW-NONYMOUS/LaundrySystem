import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { openStatus } from '@/lib/public-site';
import type { OpenStatus as Status } from '@/lib/public-site';
import { cn } from '@/lib/utils';

/**
 * "● Open now · until 8:00 PM" from the opening-hours setting, in Manila time.
 * Refreshes every minute; hidden when no opening hours are set.
 */
export function OpenStatus({ className }: { className?: string }) {
    const { site } = usePage().props;
    const [status, setStatus] = useState<Status | null>(null);

    useEffect(() => {
        const update = () => setStatus(openStatus(site.opening_hours));

        update();
        const timer = window.setInterval(update, 60_000);

        return () => window.clearInterval(timer);
    }, [site.opening_hours]);

    if (!status) {
        return null;
    }

    return (
        <span className={cn('inline-flex items-center gap-1.5', className)}>
            <span
                aria-hidden
                className={cn(
                    'size-2 rounded-full',
                    status.isOpen ? 'bg-success' : 'bg-muted-foreground',
                )}
            />
            <span className="font-medium">
                {status.isOpen ? 'Open now' : 'Closed'}
            </span>
            <span className="opacity-80">· {status.detail}</span>
        </span>
    );
}
