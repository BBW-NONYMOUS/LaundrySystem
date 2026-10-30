import { TestimonialCard } from '@/components/public/testimonial-card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import type { PublicTestimonial } from '@/types/public';

/**
 * Reviews carousel: 1 card on phones, 2 on tablets, 3 on desktop. Moves only on swipe or
 * arrow press (no autoplay). The arrows sit below the cards so they never overflow on phones.
 */
export function TestimonialCarousel({
    testimonials,
}: {
    testimonials: PublicTestimonial[];
}) {
    const canScroll = testimonials.length > 1;

    return (
        <Carousel
            opts={{ align: 'start' }}
            aria-label="Customer reviews"
            className="w-full"
        >
            <CarouselContent>
                {testimonials.map((testimonial) => (
                    <CarouselItem
                        key={testimonial.id}
                        className="sm:basis-1/2 lg:basis-1/3"
                    >
                        <TestimonialCard testimonial={testimonial} />
                    </CarouselItem>
                ))}
            </CarouselContent>
            {canScroll && (
                <div className="mt-6 flex justify-center gap-3">
                    <CarouselPrevious className="static size-10 translate-y-0" />
                    <CarouselNext className="static size-10 translate-y-0" />
                </div>
            )}
        </Carousel>
    );
}
