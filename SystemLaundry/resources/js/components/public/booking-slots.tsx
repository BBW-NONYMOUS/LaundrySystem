import { Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { BookingSlot } from '@/types/public';

function availabilityText(slot: BookingSlot): string {
    if (!slot.available) {
        return slot.reason ?? 'Fully booked';
    }

    return slot.remaining === 1
        ? '1 slot left'
        : `${slot.remaining} slots left`;
}

/**
 * The day's three pickup windows as radio cards. Full or too-late slots are disabled
 * and say why; the list is announced when another date loads.
 */
export function BookingSlots({
    id,
    slots,
    value,
    onChange,
    loading = false,
    describedBy,
    invalid,
}: {
    id: string;
    slots: BookingSlot[];
    value: string;
    onChange: (value: string) => void;
    loading?: boolean;
    describedBy?: string;
    invalid?: boolean;
}) {
    if (loading) {
        return (
            <div className="grid gap-3 sm:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <RadioGroup
            id={id}
            value={value}
            onValueChange={onChange}
            aria-label="Pickup time"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            aria-live="polite"
            className="grid gap-3 sm:grid-cols-3"
        >
            {slots.map((slot) => (
                <Label
                    key={slot.value}
                    htmlFor={`${id}-${slot.value}`}
                    className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50',
                        'has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5',
                        !slot.available &&
                            'cursor-not-allowed bg-muted/50 opacity-60 hover:border-border',
                    )}
                >
                    <RadioGroupItem
                        id={`${id}-${slot.value}`}
                        value={slot.value}
                        disabled={!slot.available}
                    />
                    <span className="grid gap-0.5">
                        <span className="flex items-center gap-1.5 text-base font-medium">
                            <Clock className="size-4 text-fresh" aria-hidden />
                            {slot.window}
                        </span>
                        <span
                            className={cn(
                                'text-sm',
                                slot.available
                                    ? slot.remaining === 1
                                        ? 'font-medium text-warning'
                                        : 'text-muted-foreground'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {availabilityText(slot)}
                        </span>
                    </span>
                </Label>
            ))}
        </RadioGroup>
    );
}
