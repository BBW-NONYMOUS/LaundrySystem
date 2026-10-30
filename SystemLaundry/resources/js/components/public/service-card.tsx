import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { peso } from '@/lib/public-site';
import { cn } from '@/lib/utils';

/** Aqua icon tile used by service, step and feature cards. */
export function IconTile({
    icon: Icon,
    className,
}: {
    icon: LucideIcon;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl bg-fresh/10 text-fresh',
                className,
            )}
        >
            <Icon className="size-[22px]" aria-hidden />
        </span>
    );
}

/**
 * Home service card: icon, name, one-line description and the live "from" price
 * (or the express surcharge).
 */
export function ServiceCard({
    icon,
    title,
    description,
    from,
    surchargePercent,
    currencySymbol,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    from: { price: number; unit: string } | null;
    surchargePercent?: number;
    currencySymbol: string | null;
}) {
    return (
        <Card className="h-full gap-0 rounded-2xl py-6 shadow-sm transition hover:shadow-md motion-safe:hover:-translate-y-0.5">
            <CardContent className="flex h-full flex-col gap-4">
                <IconTile icon={icon} />
                <div className="flex flex-1 flex-col gap-2">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-pretty text-muted-foreground">
                        {description}
                    </p>
                </div>
                <p className="text-sm text-muted-foreground">
                    {from ? (
                        <>
                            from{' '}
                            <span className="text-xl font-semibold text-foreground tabular-nums">
                                {peso(from.price, currencySymbol)}
                            </span>
                            /{from.unit}
                        </>
                    ) : (
                        <>
                            <span className="text-xl font-semibold text-foreground tabular-nums">
                                +{surchargePercent}%
                            </span>{' '}
                            surcharge
                        </>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}
