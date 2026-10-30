import { Link } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'destructive';

const toneClasses: Record<Tone, string> = {
    default: '',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
};

/**
 * KPI card in the style of the dashboard-01 block's SectionCards.
 */
export function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    footer,
    hint,
    tone = 'default',
    href,
    className,
}: {
    title: string;
    value: ReactNode;
    icon?: LucideIcon;
    /** Percent change vs. the previous period; null hides the badge. */
    trend?: number | null;
    footer?: ReactNode;
    hint?: ReactNode;
    tone?: Tone;
    href?: NonNullable<InertiaLinkProps['href']>;
    className?: string;
}) {
    const card = (
        <Card
            className={cn(
                '@container/card h-full gap-4 bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card',
                href && 'transition-colors hover:border-primary/40',
                className,
            )}
        >
            <CardHeader>
                <CardDescription className="flex items-center gap-2">
                    {Icon && <Icon className="size-4" aria-hidden />}
                    {title}
                </CardDescription>
                <CardTitle
                    className={cn(
                        'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
                        toneClasses[tone],
                    )}
                >
                    {value}
                </CardTitle>
                {trend !== undefined && trend !== null && (
                    <CardAction>
                        <Badge
                            variant="outline"
                            className={
                                trend >= 0 ? 'text-success' : 'text-destructive'
                            }
                        >
                            {trend >= 0 ? <TrendingUp /> : <TrendingDown />}
                            {trend >= 0 ? '+' : ''}
                            {trend.toFixed(0)}%
                        </Badge>
                    </CardAction>
                )}
            </CardHeader>
            {(footer || hint) && (
                <CardFooter className="flex-col items-start gap-1 text-sm">
                    {footer && (
                        <div className="line-clamp-1 font-medium">{footer}</div>
                    )}
                    {hint && (
                        <div className="text-muted-foreground">{hint}</div>
                    )}
                </CardFooter>
            )}
        </Card>
    );

    return href ? (
        <Link
            href={href}
            prefetch
            className="block rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            {card}
        </Link>
    ) : (
        card
    );
}

/** Percent change helper for trend badges (null when there is nothing to compare). */
export function percentChange(
    current: number,
    previous: number,
): number | null {
    if (previous === 0) {
        return current === 0 ? 0 : null;
    }

    return ((current - previous) / previous) * 100;
}
