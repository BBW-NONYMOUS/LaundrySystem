import { IconTile } from '@/components/public/service-card';
import { peso, serviceIcon, unitWord } from '@/lib/public-site';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/models';

/** 24 → "24 h", 72 → "3 days". */
export function turnaroundLabel(hours: number): string {
    return hours >= 48 && hours % 24 === 0
        ? `${hours / 24} days`
        : `${hours} h`;
}

/** "Min. 3 kg · Ready in 24 h · Express in 8 h" (the minimum is left out when it's 1 piece). */
export function serviceMeta(service: Service): string {
    const unit = unitWord(service.pricing_unit);
    const parts: string[] = [];

    if (service.pricing_unit === 'per_kg' || service.min_quantity > 1) {
        const plural =
            unit === 'piece' && service.min_quantity !== 1 ? 's' : '';
        parts.push(`Min. ${service.min_quantity} ${unit}${plural}`);
    }

    parts.push(`Ready in ${turnaroundLabel(service.turnaround_hours)}`);
    parts.push(
        service.offers_express && service.express_turnaround_hours
            ? `Express in ${turnaroundLabel(service.express_turnaround_hours)}`
            : 'No express option',
    );

    return parts.join(' · ');
}

/**
 * One service on the Pricing page: icon, name, description, meta line and price.
 */
export function ServiceRow({
    service,
    currencySymbol,
    className,
}: {
    service: Service;
    currencySymbol: string | null;
    className?: string;
}) {
    return (
        <li
            className={cn(
                'flex gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6',
                className,
            )}
        >
            <IconTile icon={serviceIcon(service.code)} />
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    {service.description && (
                        <p className="text-pretty text-muted-foreground">
                            {service.description}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                        {serviceMeta(service)}
                    </p>
                </div>
                <p className="shrink-0 text-muted-foreground sm:text-right">
                    <span className="text-2xl font-semibold text-foreground tabular-nums">
                        {peso(service.price, currencySymbol)}
                    </span>
                    /{unitWord(service.pricing_unit)}
                </p>
            </div>
        </li>
    );
}
