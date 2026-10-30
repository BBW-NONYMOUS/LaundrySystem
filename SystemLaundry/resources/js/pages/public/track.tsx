import { useForm, usePage } from '@inertiajs/react';
import { Lock, MessageSquareText, Phone, Receipt } from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHero } from '@/components/public/page-hero';
import {
    FormAlert,
    PublicField,
    focusFirstError,
} from '@/components/public/public-form';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { displayPhone, telHref } from '@/lib/public-site';
import { lookup } from '@/routes/public/track';
import type { Seo } from '@/types/public';

type Props = {
    /** Pre-filled from ?order= (receipt QR codes). */
    orderNumber: string;
    seo: Seo;
};

const FIELDS = ['order_number', 'phone'];

/**
 * Track an order with the receipt's order number + the customer's mobile number
 * (docs/public-site/04 §5.1). A match goes to /track/{code}.
 */
export default function TrackOrder({ orderNumber, seo }: Props) {
    const { site } = usePage().props;
    const form = useForm({ order_number: orderNumber, phone: '' });
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(lookup.url(), {
            preserveScroll: true,
            onError: (fieldErrors) =>
                focusFirstError('track', FIELDS, fieldErrors),
        });
    };

    return (
        <>
            <SeoHead seo={seo} />
            <PageHero
                breadcrumb="Track Order"
                title="Track your order"
                description="Enter the order number from your receipt and the mobile number you gave us."
            />

            <Section className="py-10 md:py-16">
                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="pt-6">
                            <form
                                onSubmit={submit}
                                className="grid gap-5"
                                noValidate
                            >
                                <FormAlert message={errors.form} />

                                <PublicField
                                    id="track-order_number"
                                    label="Order number"
                                    error={errors.order_number}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="order_number"
                                            value={form.data.order_number}
                                            onChange={(event) =>
                                                form.setData(
                                                    'order_number',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="LND-20261023-0012"
                                            autoComplete="off"
                                            autoCapitalize="characters"
                                            spellCheck={false}
                                            required
                                            className="h-11 font-mono text-base"
                                        />
                                    )}
                                </PublicField>

                                <PublicField
                                    id="track-phone"
                                    label="Mobile number"
                                    error={errors.phone}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="phone"
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            value={form.data.phone}
                                            onChange={(event) =>
                                                form.setData(
                                                    'phone',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0917 123 4567"
                                            required
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-12 text-base"
                                    disabled={form.processing}
                                >
                                    {form.processing && <Spinner />}
                                    Check Status
                                </Button>

                                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Lock
                                        className="mt-0.5 size-4 shrink-0 text-fresh"
                                        aria-hidden
                                    />
                                    We only show your first name and order
                                    status — never your address or full name.
                                </p>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="h-fit rounded-2xl bg-fresh-soft shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Receipt
                                    className="size-5 text-fresh"
                                    aria-hidden
                                />
                                Where’s my order number?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-base text-muted-foreground">
                            <p>
                                It’s printed at the top of your receipt and in
                                every SMS we send, e.g.{' '}
                                <span className="font-mono text-foreground">
                                    LND-20261023-0012
                                </span>
                                .
                            </p>
                            <p className="flex items-start gap-2">
                                <MessageSquareText
                                    className="mt-1 size-4 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                Got an SMS from us? Tap the link in it to open
                                your order directly.
                            </p>
                            {site.phone && (
                                <p className="flex items-start gap-2">
                                    <Phone
                                        className="mt-1 size-4 shrink-0 text-fresh"
                                        aria-hidden
                                    />
                                    <span>
                                        Lost it?{' '}
                                        <a
                                            href={telHref(site.phone)}
                                            className="font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            Call us at{' '}
                                            {displayPhone(site.phone)}
                                        </a>{' '}
                                        and we’ll look it up.
                                    </span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </>
    );
}
