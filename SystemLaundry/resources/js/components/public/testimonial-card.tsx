import { Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PublicTestimonial } from '@/types/public';

/** Five stars, read out as "Rated 4 out of 5". */
export function Stars({
    rating,
    className,
}: {
    rating: number;
    className?: string;
}) {
    return (
        <div
            role="img"
            aria-label={`Rated ${rating} out of 5`}
            className={cn('flex items-center gap-0.5', className)}
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
        </div>
    );
}

/** "2026-10-12" → "October 2026" (parsed as a local date, no time-zone shift). */
function reviewMonth(date: string | null): string | null {
    const match = date?.match(/^(\d{4})-(\d{2})/);

    if (!match) {
        return null;
    }

    return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        1,
    ).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

function initials(name: string): string {
    return name
        .replace(/\./g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

/**
 * One customer review: stars, quote, initials avatar, display name and month.
 */
export function TestimonialCard({
    testimonial,
    className,
}: {
    testimonial: PublicTestimonial;
    className?: string;
}) {
    const month = reviewMonth(testimonial.date);

    return (
        <Card
            className={cn('h-full gap-4 rounded-2xl py-6 shadow-sm', className)}
        >
            <CardContent className="flex flex-1 flex-col gap-4">
                <Stars rating={testimonial.rating} />
                <blockquote className="flex-1 text-base leading-7 text-pretty">
                    “{testimonial.comment}”
                </blockquote>
            </CardContent>
            <CardFooter className="gap-3">
                <Avatar className="size-10">
                    <AvatarFallback className="bg-fresh/10 text-sm font-semibold text-fresh">
                        {initials(testimonial.author_name)}
                    </AvatarFallback>
                </Avatar>
                <div className="grid text-sm">
                    <span className="font-semibold">
                        {testimonial.author_name}
                    </span>
                    {month && (
                        <span className="text-muted-foreground">{month}</span>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
}
