import { format, parseISO } from 'date-fns';
import {
    CalendarCheck,
    CircleCheck,
    Clock,
    Truck,
    WashingMachine,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { quantity as formatQuantity } from '@/lib/format';
import { peso, unitWord } from '@/lib/public-site';
import type { Estimate } from '@/lib/public-site';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/models';

export type BookingSummaryData = {
    date: string;
    window: string | null;
    service: Service | null;
    quantity: number | null;
    express: boolean;
    delivery: boolean;
    estimate: Estimate | null;
    symbol: string | null;
};

const promises = [
    'Free SMS updates',
    'Pay when your laundry is delivered',
    'Free to cancel — just call us',
];

/**
 * "Your pickup" card beside the booking form (sticky on desktop).
 */
export function BookingSummary({
    summary,
    className,
}: {
    summary: BookingSummaryData;
    className?: string;
}) {
    const { date, window, service, quantity, express, delivery, estimate } =
        summary;
    const ready = Boolean(date && window);

    return (
        <Card className={cn('rounded-2xl shadow-sm', className)}>
            <CardHeader>
                <CardTitle className="text-lg">Your pickup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                {ready ? (
                    <ul className="grid gap-2.5 text-base">
                        <SummaryLine icon={CalendarCheck}>
                            {format(parseISO(date), 'EEE, MMM d')}
                        </SummaryLine>
                        <SummaryLine icon={Clock}>{window}</SummaryLine>
                        {service && (
                            <SummaryLine icon={WashingMachine}>
                                {service.name}
                                {quantity
                                    ? ` · ~${formatQuantity(quantity, service.pricing_unit === 'per_kg' ? 'kg' : quantity === 1 ? 'piece' : 'pieces')}`
                                    : ''}
                            </SummaryLine>
                        )}
                        {express && (
                            <SummaryLine icon={Zap}>Express</SummaryLine>
                        )}
                        <SummaryLine icon={Truck}>
                            {delivery
                                ? 'Pickup and delivery'
                                : 'Pickup only — collect at the shop'}
                        </SummaryLine>
                    </ul>
                ) : (
                    <p className="text-base text-muted-foreground">
                        Choose a date and time to see your summary.
                    </p>
                )}

                {estimate && service && (
                    <>
                        <Separator />
                        <EstimateTotal
                            estimate={estimate}
                            service={service}
                            symbol={summary.symbol}
                        />
                    </>
                )}

                <Separator />
                <ul className="grid gap-2 text-sm text-muted-foreground">
                    {promises.map((promise) => (
                        <li key={promise} className="flex items-center gap-2">
                            <CircleCheck
                                className="size-4 shrink-0 text-fresh"
                                aria-hidden
                            />
                            {promise}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

/** Estimated total with its breakdown; "final price after weighing". */
export function EstimateTotal({
    estimate,
    service,
    symbol,
    compact = false,
}: {
    estimate: Estimate;
    service: Service;
    symbol: string | null;
    compact?: boolean;
}) {
    return (
        <div className="grid gap-1.5">
            {!compact && (
                <dl className="grid gap-1 text-sm text-muted-foreground">
                    <Row
                        label={`${service.name} (${formatQuantity(estimate.chargedQuantity)} ${unitWord(service.pricing_unit)})`}
                    >
                        {peso(estimate.subtotal, symbol)}
                    </Row>
                    {estimate.expressFee > 0 && (
                        <Row label="Express">
                            {peso(estimate.expressFee, symbol)}
                        </Row>
                    )}
                    {estimate.deliveryFee > 0 && (
                        <Row label="Pickup & delivery">
                            {peso(estimate.deliveryFee, symbol)}
                        </Row>
                    )}
                </dl>
            )}
            <p className="flex items-baseline justify-between gap-4">
                <span className="font-medium">Estimated total</span>
                <span className="text-2xl font-semibold tabular-nums">
                    {peso(estimate.total, symbol)}
                </span>
            </p>
            <p className="text-sm text-muted-foreground">
                Final price after weighing at the shop.
            </p>
        </div>
    );
}

function Row({ label, children }: { label: string; children: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt>{label}</dt>
            <dd className="tabular-nums">{children}</dd>
        </div>
    );
}

function SummaryLine({
    icon: Icon,
    children,
}: {
    icon: LucideIcon;
    children: ReactNode;
}) {
    return (
        <li className="flex items-start gap-2.5">
            <Icon className="mt-1 size-4 shrink-0 text-fresh" aria-hidden />
            <span>{children}</span>
        </li>
    );
}
