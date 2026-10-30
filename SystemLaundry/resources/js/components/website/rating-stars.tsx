import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Read-only 1–5 star rating, announced as "Rated 4 out of 5".
 */
export function RatingStars({
    rating,
    className,
}: {
    rating: number;
    className?: string;
}) {
    return (
        <span
            role="img"
            aria-label={`Rated ${rating} out of 5`}
            className={cn('inline-flex items-center gap-0.5', className)}
        >
            {[1, 2, 3, 4, 5].map((value) => (
                <Star
                    key={value}
                    aria-hidden
                    className={cn(
                        'size-4',
                        value <= rating
                            ? 'fill-current text-fresh'
                            : 'text-muted-foreground/40',
                    )}
                />
            ))}
        </span>
    );
}
