import { AlarmClock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    deliveryStatusStyles,
    orderStatusStyles,
    paymentStatusStyles,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import type {
    DeliveryStatus,
    OrderStatus,
    PaymentStatus,
} from '@/types/models';

/**
 * Order status: color + icon + label, so it reads correctly without color too.
 */
export function StatusBadge({
    status,
    className,
    size = 'default',
}: {
    status: OrderStatus;
    className?: string;
    size?: 'default' | 'lg';
}) {
    const style = orderStatusStyles[status];
    const Icon = style.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                style.badge,
                size === 'lg' && 'gap-1.5 px-3 py-1 text-sm [&>svg]:size-4',
                className,
            )}
        >
            <Icon aria-hidden />
            {style.label}
        </Badge>
    );
}

export function PaymentBadge({
    status,
    className,
}: {
    status: PaymentStatus;
    className?: string;
}) {
    const style = paymentStatusStyles[status];

    return (
        <Badge variant="outline" className={cn(style.badge, className)}>
            {style.label}
        </Badge>
    );
}

export function DeliveryStatusBadge({
    status,
    label,
    className,
}: {
    status: DeliveryStatus;
    label: string;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(deliveryStatusStyles[status], className)}
        >
            {label}
        </Badge>
    );
}

export function ExpressBadge({ className }: { className?: string }) {
    return (
        <Badge
            className={cn(
                'border-transparent bg-warning text-white dark:text-neutral-950',
                className,
            )}
        >
            <Zap aria-hidden />
            Express
        </Badge>
    );
}

export function OverdueBadge({ className }: { className?: string }) {
    return (
        <Badge
            variant="outline"
            className={cn('border-destructive/30 text-destructive', className)}
        >
            <AlarmClock aria-hidden />
            Overdue
        </Badge>
    );
}
