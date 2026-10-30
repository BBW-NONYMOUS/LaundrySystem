import { useForm, usePage } from '@inertiajs/react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import { ContactInfo } from '@/components/public/contact-info';
import { PageHero } from '@/components/public/page-hero';
import {
    FormAlert,
    HoneypotField,
    PublicField,
    focusFirstError,
} from '@/components/public/public-form';
import { Section } from '@/components/public/section';
import { SeoHead } from '@/components/public/seo-head';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { shortCity } from '@/lib/public-site';
import { privacy } from '@/routes/public';
import { store } from '@/routes/public/contact';
import type { Seo } from '@/types/public';

type Props = {
    /** Google Maps "Embed a map" URL from Settings, or null to hide the map. */
    mapEmbedUrl: string | null;
    formToken: string;
    seo: Seo;
};

const TOPICS = [
    'General question',
    'About an existing order',
    'Pickup & delivery',
    'Business or bulk laundry',
    'Feedback',
];

const FIELDS = ['name', 'phone', 'email', 'subject', 'message', 'consent'];

/**
 * Contact form, shop details and map (docs/public-site/04 §9). Messages land in the
 * staff inbox (Website → Messages).
 */
export default function Contact({ mapEmbedUrl, formToken, seo }: Props) {
    const { site } = usePage().props;
    const initial = {
        name: '',
        phone: '',
        email: '',
        subject: TOPICS[0],
        message: '',
        consent: false,
        website: '',
        form_token: formToken,
    };
    const form = useForm(initial);
    const { data, setData } = form;
    const errors = form.errors as Record<string, string | undefined>;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((values) => ({
            ...values,
            phone: values.phone || null,
            email: values.email || null,
        }));
        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: (response) => {
                // The thank-you toast comes from the server; start a fresh message.
                form.setData({
                    ...initial,
                    form_token: stringProp(response.props.formToken, formToken),
                });
                form.clearErrors();
            },
            onError: (fieldErrors) =>
                focusFirstError('contact', FIELDS, fieldErrors),
        });
    };

    return (
        <>
            <SeoHead seo={seo} />
            <PageHero
                breadcrumb="Contact"
                eyebrow="Contact"
                title="Get in touch"
                description="Questions about an order, a big load or a business account? We’re happy to help."
            />

            <Section className="py-10 md:py-16">
                <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                    <Card className="rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">
                                Send us a message
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={submit}
                                noValidate
                                className="relative grid gap-5"
                            >
                                <FormAlert message={errors.form} />
                                <HoneypotField
                                    value={data.website}
                                    onChange={(value) =>
                                        setData('website', value)
                                    }
                                />

                                <PublicField
                                    id="contact-name"
                                    label="Your name"
                                    error={errors.name}
                                >
                                    {(aria) => (
                                        <Input
                                            {...aria}
                                            name="name"
                                            autoComplete="name"
                                            value={data.name}
                                            onChange={(event) =>
                                                setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Juan Dela Cruz"
                                            className="h-11 text-base"
                                        />
                                    )}
                                </PublicField>

                                <div className="grid gap-2">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <PublicField
                                            id="contact-phone"
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
                                                    aria-describedby={[
                                                        aria[
                                                            'aria-describedby'
                                                        ],
                                                        'contact-reply-hint',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    value={data.phone}
                                                    onChange={(event) =>
                                                        setData(
                                                            'phone',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="0917 123 4567"
                                                    className="h-11 text-base"
                                                />
                                            )}
                                        </PublicField>
                                        <PublicField
                                            id="contact-email"
                                            label="Email"
                                            error={errors.email}
                                        >
                                            {(aria) => (
                                                <Input
                                                    {...aria}
                                                    name="email"
                                                    type="email"
                                                    autoComplete="email"
                                                    aria-describedby={[
                                                        aria[
                                                            'aria-describedby'
                                                        ],
                                                        'contact-reply-hint',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    value={data.email}
                                                    onChange={(event) =>
                                                        setData(
                                                            'email',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="you@example.com"
                                                    className="h-11 text-base"
                                                />
                                            )}
                                        </PublicField>
                                    </div>
                                    <p
                                        id="contact-reply-hint"
                                        className="text-sm text-muted-foreground"
                                    >
                                        Give us at least one so we can reply.
                                    </p>
                                </div>

                                <PublicField
                                    id="contact-subject"
                                    label="Topic"
                                    error={errors.subject}
                                >
                                    {(aria) => (
                                        <Select
                                            value={data.subject}
                                            onValueChange={(value) =>
                                                setData('subject', value)
                                            }
                                        >
                                            <SelectTrigger
                                                {...aria}
                                                className="h-11! w-full text-base"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TOPICS.map((topic) => (
                                                    <SelectItem
                                                        key={topic}
                                                        value={topic}
                                                    >
                                                        {topic}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </PublicField>

                                <PublicField
                                    id="contact-message"
                                    label="Message"
                                    error={errors.message}
                                >
                                    {(aria) => (
                                        <Textarea
                                            {...aria}
                                            name="message"
                                            rows={5}
                                            value={data.message}
                                            onChange={(event) =>
                                                setData(
                                                    'message',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="How can we help?"
                                            className="text-base"
                                        />
                                    )}
                                </PublicField>

                                <div className="grid gap-2">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="contact-consent"
                                            checked={data.consent}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'consent',
                                                    checked === true,
                                                )
                                            }
                                            aria-invalid={
                                                errors.consent
                                                    ? true
                                                    : undefined
                                            }
                                            aria-describedby={
                                                errors.consent
                                                    ? 'contact-consent-error'
                                                    : undefined
                                            }
                                            className="mt-0.5 size-5"
                                        />
                                        <Label
                                            htmlFor="contact-consent"
                                            className="block text-base leading-snug font-normal"
                                        >
                                            I agree that {site.name} may use my
                                            details to reply to me. Read our{' '}
                                            <a
                                                href={privacy.url()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-primary underline-offset-4 hover:underline"
                                            >
                                                Privacy Notice
                                            </a>
                                            .
                                        </Label>
                                    </div>
                                    {errors.consent && (
                                        <p
                                            id="contact-consent-error"
                                            role="alert"
                                            className="text-sm text-destructive"
                                        >
                                            {errors.consent}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-12 text-base sm:justify-self-start sm:px-10"
                                    disabled={form.processing}
                                >
                                    {form.processing && <Spinner />}
                                    Send Message
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <ContactInfo />
                </div>
            </Section>

            <Section className="pt-0 md:pt-0" labelledBy="map-title">
                <h2 id="map-title" className="sr-only">
                    Map
                </h2>
                {mapEmbedUrl ? (
                    <div className="overflow-hidden rounded-2xl border shadow-sm">
                        <AspectRatio ratio={16 / 9}>
                            <iframe
                                src={mapEmbedUrl}
                                title={`Map showing ${site.name}`}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                                className="size-full border-0"
                            />
                        </AspectRatio>
                    </div>
                ) : (
                    site.address && (
                        <div className="flex flex-col items-start gap-4 rounded-2xl border bg-fresh-soft p-6 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex items-start gap-3 text-base">
                                <MapPin
                                    className="mt-0.5 size-5 shrink-0 text-fresh"
                                    aria-hidden
                                />
                                <span>
                                    {site.address}
                                    {shortCity(site.city) &&
                                        `, ${shortCity(site.city)}`}
                                </span>
                            </p>
                            {site.map_link && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="h-11"
                                >
                                    <a
                                        href={site.map_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open in Google Maps
                                        <ExternalLink aria-hidden />
                                    </a>
                                </Button>
                            )}
                        </div>
                    )
                )}
            </Section>
        </>
    );
}

/** A string page prop from the redirect response, else the current value. */
function stringProp(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
}
