import { Link, useForm } from '@inertiajs/react';
import { CircleCheck, Heart } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    FormAlert,
    HoneypotField,
    PublicField,
    focusFirstError,
} from '@/components/public/public-form';
import { Container } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { StarRating } from '@/components/public/star-rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { home } from '@/routes';
import { book } from '@/routes/public';
import { store } from '@/routes/public/feedback';
import type { Seo } from '@/types/public';

type Props = {
    order: {
        order_number: string;
        tracking_code: string;
        completed_at: string | null;
        customer_first_name: string;
    };
    alreadyRated: boolean;
    formToken: string;
    seo: Seo;
};

const FIELDS = ['rating', 'comment'];

/**
 * "Rate your laundry" from the order-completed SMS (docs/public-site/04 §10).
 * One review per order; it stays hidden until the owner approves it.
 */
export default function Feedback({
    order,
    alreadyRated,
    formToken,
    seo,
}: Props) {
    const [submitted, setSubmitted] = useState(false);
    const form = useForm({
        rating: 0,
        comment: '',
        website: '',
        form_token: formToken,
    });
    const { data, setData } = form;
    const errors = form.errors as Record<string, string | undefined>;
    const name = order.customer_first_name;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(store.url(order.tracking_code), {
            preserveScroll: true,
            // Keep this component mounted so the thank-you state survives the redirect.
            preserveState: true,
            onSuccess: () => setSubmitted(true),
            onError: (fieldErrors) =>
                focusFirstError('feedback', FIELDS, fieldErrors),
        });
    };

    return (
        <>
            <SeoHead seo={seo} />
            <div className="bg-linear-to-b from-fresh-soft to-background">
                <Container className="max-w-xl py-10 md:py-16">
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="pt-6">
                            {submitted ? (
                                <Outcome
                                    icon="thanks"
                                    title={`Thank you, ${name}!`}
                                    text="The owner reads every review, so if anything went wrong, we’ll make it right."
                                    action={
                                        <Button asChild className="h-11">
                                            <Link href={home()}>
                                                Back to home
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : alreadyRated ? (
                                <Outcome
                                    icon="done"
                                    title="You’ve already rated this order"
                                    text="Thanks again for your feedback!"
                                    action={
                                        <Button asChild className="h-11">
                                            <Link href={book()}>
                                                Book another pickup
                                            </Link>
                                        </Button>
                                    }
                                />
                            ) : (
                                <form
                                    onSubmit={submit}
                                    noValidate
                                    className="relative grid gap-6"
                                >
                                    <div className="grid gap-2 text-center">
                                        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                                            How did we do, {name}?
                                        </h1>
                                        <p className="text-base text-muted-foreground">
                                            Order{' '}
                                            <span className="font-mono">
                                                {order.order_number}
                                            </span>
                                            . Your review helps neighbors find
                                            us — and helps us get better.
                                        </p>
                                    </div>

                                    <FormAlert message={errors.form} />
                                    <HoneypotField
                                        value={data.website}
                                        onChange={(value) =>
                                            setData('website', value)
                                        }
                                    />

                                    <div className="grid gap-2">
                                        <StarRating
                                            id="feedback-rating"
                                            value={data.rating}
                                            onChange={(value) =>
                                                setData('rating', value)
                                            }
                                            invalid={
                                                errors.rating ? true : undefined
                                            }
                                            describedBy={
                                                errors.rating
                                                    ? 'feedback-rating-error'
                                                    : undefined
                                            }
                                        />
                                        {errors.rating && (
                                            <p
                                                id="feedback-rating-error"
                                                role="alert"
                                                className="text-center text-sm text-destructive"
                                            >
                                                {errors.rating}
                                            </p>
                                        )}
                                    </div>

                                    <PublicField
                                        id="feedback-comment"
                                        label="Tell us more"
                                        error={errors.comment}
                                    >
                                        {(aria) => (
                                            <Textarea
                                                {...aria}
                                                name="comment"
                                                rows={4}
                                                maxLength={1000}
                                                value={data.comment}
                                                onChange={(event) =>
                                                    setData(
                                                        'comment',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="What did you like? What could we do better?"
                                                className="text-base"
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
                                        Send Review
                                    </Button>

                                    <p className="text-center text-sm text-muted-foreground">
                                        Only your first name and last initial
                                        are shown if we feature your review.
                                    </p>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </Container>
            </div>
        </>
    );
}

function Outcome({
    icon,
    title,
    text,
    action,
}: {
    icon: 'thanks' | 'done';
    title: string;
    text: string;
    action: ReactNode;
}) {
    const Icon = icon === 'thanks' ? Heart : CircleCheck;

    return (
        <div
            className="flex flex-col items-center gap-4 py-6 text-center"
            aria-live="polite"
        >
            <span className="flex size-14 items-center justify-center rounded-full bg-fresh/10 text-fresh">
                <Icon className="size-7" aria-hidden />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
            </h1>
            <p className="max-w-sm text-base text-muted-foreground">{text}</p>
            {action}
        </div>
    );
}
