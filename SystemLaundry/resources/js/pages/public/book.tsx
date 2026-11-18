import { Link, router, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { CalendarX } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { BookingDatePicker } from '@/components/public/booking-date-picker';
import { BookingSlots } from '@/components/public/booking-slots';
import { PageHero } from '@/components/public/page-hero';
import { PublicField } from '@/components/public/public-form';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { displayPhone, telHref } from '@/lib/public-site';
import { proceed } from '@/routes/public/book';
import type { BookableDate, BookingSlot, Seo } from '@/types/public';

type Props = {
    dates: BookableDate[];
    selectedDate: string;
    slots: BookingSlot[];
    seo: Seo;
};

/**
 * Guest "Book a Pickup": pick a day and time, then log in or register. The portal
 * booking takes over from there with that time filled in, and uses the name, mobile
 * and address on the customer's account, so the guest page doesn't ask for them.
 */
export default function BookPickup({ dates, selectedDate, slots, seo }: Props) {
    const { site } = usePage().props;
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [date, setDate] = useState(selectedDate);
    const [slot, setSlot] = useState('');

    // Slots belong to `selectedDate`; while another day loads, show placeholders.
    const slotsForDate = selectedDate === date && !loadingSlots;
    const allFull = slotsForDate && slots.every((entry) => !entry.available);
    const nextAvailable = dates.find(
        (entry) => entry.date > date && entry.available,
    );

    const chooseDate = (next: string) => {
        setDate(next);
        setSlot('');
        router.reload({
            only: ['slots', 'selectedDate'],
            data: { date: next },
            onStart: () => setLoadingSlots(true),
            onFinish: () => setLoadingSlots(false),
        });
    };

    const chosen = slot ? { date, slot } : {};

    return (
        <>
            <SeoHead seo={seo} />
            <PageHero
                breadcrumb="Book a Pickup"
                title="Book a pickup"
                description="Tell us when. Our rider comes to your door, and we’ll confirm by SMS."
            />

            <Section className="py-10 md:py-16">
                <div className="mx-auto grid max-w-3xl gap-8">
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="grid gap-5 pt-6">
                            <h2 className="text-xl font-semibold tracking-tight">
                                When should we come?
                            </h2>

                            <PublicField
                                id="book-pickup_date"
                                label="Pickup date"
                            >
                                {(aria) => (
                                    <BookingDatePicker
                                        id={aria.id}
                                        describedBy={aria['aria-describedby']}
                                        dates={dates}
                                        value={date}
                                        onChange={chooseDate}
                                    />
                                )}
                            </PublicField>

                            <PublicField
                                id="book-time_slot"
                                label="Pickup time"
                            >
                                {(aria) => (
                                    <BookingSlots
                                        id={aria.id}
                                        describedBy={aria['aria-describedby']}
                                        invalid={aria['aria-invalid']}
                                        slots={slots}
                                        loading={!slotsForDate}
                                        value={slot}
                                        onChange={setSlot}
                                    />
                                )}
                            </PublicField>

                            {allFull && (
                                <Alert>
                                    <CalendarX aria-hidden />
                                    <AlertTitle>This day is full</AlertTitle>
                                    <AlertDescription>
                                        <p>
                                            All pickup times on{' '}
                                            {format(
                                                parseISO(date),
                                                'EEEE, MMMM d',
                                            )}{' '}
                                            are taken.
                                            {nextAvailable &&
                                                ` Try ${format(parseISO(nextAvailable.date), 'EEEE, MMMM d')}`}
                                            {site.phone ? (
                                                <>
                                                    , or{' '}
                                                    <a
                                                        href={telHref(
                                                            site.phone,
                                                        )}
                                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                                    >
                                                        call us at{' '}
                                                        {displayPhone(
                                                            site.phone,
                                                        )}
                                                    </a>{' '}
                                                    — we’ll try to fit you in.
                                                </>
                                            ) : (
                                                '.'
                                            )}
                                        </p>
                                        {nextAvailable && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() =>
                                                    chooseDate(
                                                        nextAvailable.date,
                                                    )
                                                }
                                            >
                                                Show{' '}
                                                {format(
                                                    parseISO(
                                                        nextAvailable.date,
                                                    ),
                                                    'EEE, MMM d',
                                                )}
                                            </Button>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-3">
                        <p className="text-base text-muted-foreground">
                            Log in or create an account to finish. We’ll use the
                            name, mobile number and address on your account.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <ContinueButton href={proceed({ query: chosen })}>
                                Log in to book
                            </ContinueButton>
                            <ContinueButton
                                href={proceed({
                                    query: { ...chosen, to: 'register' },
                                })}
                                variant="outline"
                            >
                                Create an account
                            </ContinueButton>
                        </div>
                    </div>
                </div>
            </Section>
        </>
    );
}

function ContinueButton({
    href,
    variant = 'default',
    children,
}: {
    href: ComponentProps<typeof Link>['href'];
    variant?: 'default' | 'outline';
    children: ReactNode;
}) {
    return (
        <Button
            asChild
            size="lg"
            variant={variant}
            className="h-12 w-full text-base sm:w-auto sm:px-10"
        >
            <Link href={href}>{children}</Link>
        </Button>
    );
}
