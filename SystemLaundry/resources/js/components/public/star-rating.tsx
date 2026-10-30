import { Star } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

/**
 * Five large stars as a radio group: arrow keys move between ratings and screen
 * readers hear "4 stars, Great".
 */
export function StarRating({
    id,
    value,
    onChange,
    describedBy,
    invalid,
}: {
    id: string;
    value: number;
    onChange: (value: number) => void;
    describedBy?: string;
    invalid?: boolean;
}) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;

    return (
        <div className="flex flex-col items-center gap-2">
            <RadioGroupPrimitive.Root
                id={id}
                value={value ? String(value) : ''}
                onValueChange={(next) => onChange(Number(next))}
                orientation="horizontal"
                aria-label="Your rating"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className="flex gap-1 sm:gap-2"
                onMouseLeave={() => setHover(0)}
            >
                {RATING_LABELS.map((label, index) => {
                    const rating = index + 1;

                    return (
                        <RadioGroupPrimitive.Item
                            key={rating}
                            value={String(rating)}
                            aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}, ${label}`}
                            onMouseEnter={() => setHover(rating)}
                            className="rounded-lg p-1 transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        >
                            <Star
                                aria-hidden
                                className={cn(
                                    'size-10 sm:size-12',
                                    rating <= shown
                                        ? 'fill-current text-fresh'
                                        : 'text-muted-foreground/40',
                                )}
                                strokeWidth={1.5}
                            />
                        </RadioGroupPrimitive.Item>
                    );
                })}
            </RadioGroupPrimitive.Root>
            <p className="h-6 text-base font-medium" aria-hidden>
                {shown ? (
                    RATING_LABELS[shown - 1]
                ) : (
                    <span className="font-normal text-muted-foreground">
                        Tap a star to rate
                    </span>
                )}
            </p>
        </div>
    );
}
