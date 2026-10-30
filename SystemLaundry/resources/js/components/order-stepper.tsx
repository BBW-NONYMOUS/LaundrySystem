import { Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { time } from '@/lib/format';
import { orderStatusStyles } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { OrderStatus, StatusHistory } from '@/types/models';

type Step = { status: OrderStatus; label: string };

/**
 * The steps this particular order goes through (pickup bookings start at For Pickup,
 * delivery orders end at Delivered).
 */
function stepsFor(
    status: OrderStatus,
    history: StatusHistory[],
    hasDelivery: boolean,
): Step[] {
    const visited = new Set(history.map((entry) => entry.to_status));
    const steps: OrderStatus[] = [];

    if (visited.has('pending') || status === 'pending') {
        steps.push('pending');
    }

    steps.push('received', 'washing', 'drying', 'folding', 'ready');

    if (
        hasDelivery ||
        visited.has('out_for_delivery') ||
        status === 'delivered'
    ) {
        steps.push('out_for_delivery', 'delivered');
    } else {
        steps.push('completed');
    }

    // Non-wash services jump Received → Ready; drop the steps they never visit once done.
    const skipped = (step: OrderStatus) =>
        ['washing', 'drying', 'folding'].includes(step) &&
        !visited.has(step) &&
        (visited.has('ready') || visited.has('completed'));

    return steps
        .filter((step) => !skipped(step))
        .map((step) => ({
            status: step,
            label: orderStatusStyles[step].label,
        }));
}

/**
 * Received → Washing → … progress. Desktop: labeled steps with times. Phone: a Progress bar.
 */
export function OrderStepper({
    status,
    history = [],
    hasDelivery = false,
    className,
}: {
    status: OrderStatus;
    history?: StatusHistory[];
    hasDelivery?: boolean;
    className?: string;
}) {
    if (status === 'cancelled') {
        return (
            <p
                className={cn(
                    'text-sm font-medium text-destructive',
                    className,
                )}
            >
                This order was cancelled.
            </p>
        );
    }

    const steps = stepsFor(status, history, hasDelivery);
    const currentIndex = Math.max(
        steps.findIndex((step) => step.status === status),
        0,
    );
    const reachedAt = (step: OrderStatus) =>
        [...history].reverse().find((entry) => entry.to_status === step)
            ?.created_at;
    const percent = (currentIndex / Math.max(steps.length - 1, 1)) * 100;

    return (
        <div className={className}>
            {/* Phone */}
            <div className="space-y-2 md:hidden">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                        {steps[currentIndex]?.label}
                    </span>
                    <span className="text-muted-foreground">
                        Step {currentIndex + 1} of {steps.length}
                    </span>
                </div>
                <Progress value={percent} aria-label="Order progress" />
            </div>

            {/* Desktop */}
            <ol
                className="hidden items-start md:flex"
                aria-label="Order progress"
            >
                {steps.map((step, index) => {
                    const done = index < currentIndex;
                    const current = index === currentIndex;
                    const Icon = orderStatusStyles[step.status].icon;
                    const at = reachedAt(step.status);

                    return (
                        <li
                            key={step.status}
                            className="relative flex flex-1 flex-col items-center gap-1.5 text-center"
                            aria-current={current ? 'step' : undefined}
                        >
                            {index > 0 && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        'absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2',
                                        index <= currentIndex
                                            ? 'bg-primary'
                                            : 'bg-border',
                                    )}
                                />
                            )}
                            <span
                                className={cn(
                                    'relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-background',
                                    done &&
                                        'border-primary bg-primary text-primary-foreground',
                                    current &&
                                        orderStatusStyles[step.status].solid,
                                    current &&
                                        'border-transparent ring-4 ring-primary/15',
                                    !done &&
                                        !current &&
                                        'border-border text-muted-foreground',
                                )}
                            >
                                {done ? (
                                    <Check className="size-4" />
                                ) : (
                                    <Icon className="size-4" />
                                )}
                            </span>
                            <span
                                className={cn(
                                    'text-xs',
                                    current
                                        ? 'font-semibold'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {step.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                                {at ? time(at) : ' '}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
