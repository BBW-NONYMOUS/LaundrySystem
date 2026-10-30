import { roundedStat } from '@/lib/public-site';
import { cn } from '@/lib/utils';
import type { PublicStats } from '@/types/public';

type Stat = { value: string; label: string };

/**
 * Real numbers only. Counts that are still small are swapped for plain facts, so a new
 * shop never shows "12 happy customers" (docs/public-site/04 §3.4).
 */
export function trustStats(stats: PublicStats, city: string): Stat[] {
    const years = Math.max(stats.years_in_service, 1);

    return [
        stats.orders_completed >= 100
            ? {
                  value: roundedStat(stats.orders_completed),
                  label: 'orders completed',
              }
            : { value: 'Free', label: 'SMS updates on every order' },
        stats.customers >= 50
            ? { value: roundedStat(stats.customers), label: 'happy customers' }
            : { value: '3', label: 'pickup slots every day' },
        {
            value: `${years} ${years === 1 ? 'year' : 'years'}`,
            label: city ? `serving ${city}` : 'in business',
        },
        stats.fastest_express_hours !== null
            ? {
                  value: `${stats.fastest_express_hours}-hour`,
                  label: 'express service',
              }
            : { value: '24-hour', label: 'regular turnaround' },
    ];
}

/**
 * Four key numbers in a row (2 × 2 on phones), split by thin lines on desktop.
 */
export function TrustBar({
    stats,
    city,
    className,
}: {
    stats: PublicStats;
    city: string;
    className?: string;
}) {
    return (
        <dl
            className={cn(
                'grid grid-cols-2 gap-y-8 md:grid-cols-4 md:divide-x',
                className,
            )}
        >
            {trustStats(stats, city).map((stat) => (
                <div
                    key={stat.label}
                    className="flex flex-col-reverse items-center gap-1 px-4 text-center"
                >
                    <dt className="text-sm text-muted-foreground">
                        {stat.label}
                    </dt>
                    <dd className="text-3xl font-semibold tracking-tight text-primary tabular-nums md:text-4xl">
                        {stat.value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
