import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, Globe, Info, MessageSquare } from 'lucide-react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ShopLogoField } from '@/components/website/shop-logo-field';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { edit, update } from '@/routes/shop';

type Settings = {
    shop_name: string;
    shop_address: string;
    shop_phone: string;
    shop_email: string | null;
    currency_code: string;
    currency_symbol: string;
    express_surcharge_percent: string;
    default_delivery_fee: string;
    unclaimed_after_days: string;
    reminder_interval_days: string;
    receipt_footer: string | null;
    sms_enabled: boolean;
    email_enabled: boolean;
} & WebsiteSettings;

/** Public website section (docs/public-site/04 §14.5); all optional. */
type WebsiteSettings = {
    shop_tagline: string | null;
    shop_city: string | null;
    business_hours: string | null;
    opening_hours_schema: string | null;
    facebook_url: string | null;
    messenger_url: string | null;
    instagram_url: string | null;
    map_embed_url: string | null;
    map_link: string | null;
    about_text: string | null;
    founded_year: string | null;
    service_area: string | null;
    pickup_slot_capacity: string | null;
};

const websiteKeys: (keyof WebsiteSettings)[] = [
    'shop_tagline',
    'shop_city',
    'business_hours',
    'opening_hours_schema',
    'facebook_url',
    'messenger_url',
    'instagram_url',
    'map_embed_url',
    'map_link',
    'about_text',
    'founded_year',
    'service_area',
    'pickup_slot_capacity',
];

/**
 * People often paste the whole Google Maps "Embed a map" code; keep only its src URL.
 */
function embedSrc(value: string): string {
    const match = value.match(/<iframe[^>]*\ssrc="([^"]+)"/i);

    return match ? match[1].replaceAll('&amp;', '&') : value.trim();
}

type Props = {
    settings: Settings;
    smsDriver: string;
};

type TextKey = Exclude<keyof Settings, 'sms_enabled' | 'email_enabled'>;

export default function ShopSettings({ settings, smsDriver }: Props) {
    const form = useForm({
        ...settings,
        shop_email: settings.shop_email ?? '',
        receipt_footer: settings.receipt_footer ?? '',
        // Inputs need strings; empty website settings are saved as empty.
        ...(Object.fromEntries(
            websiteKeys.map((key) => [key, settings[key] ?? '']),
        ) as Record<keyof WebsiteSettings, string>),
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.put(update.url(), { preserveScroll: true });
    };

    /** Label + input + error for one text setting. */
    const field = (
        key: TextKey,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
        hint?: string,
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
                id={key}
                value={String(form.data[key] ?? '')}
                onChange={(event) => form.setData(key, event.target.value)}
                {...props}
            />
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            <InputError message={form.errors[key]} />
        </div>
    );

    const symbol = form.data.currency_symbol || '₱';
    const surcharge = Number(form.data.express_surcharge_percent || 0);

    return (
        <>
            <Head title="Shop settings" />

            <h1 className="sr-only">Shop settings</h1>

            <form onSubmit={submit} className="space-y-6">
                <Heading
                    variant="small"
                    title="Shop"
                    description="Shop details, pricing rules, reminders and customer notifications"
                />

                <Card>
                    <CardHeader>
                        <CardTitle>Shop profile</CardTitle>
                        <CardDescription>
                            Printed on receipts and used in SMS/email messages.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {field('shop_name', 'Shop name')}
                        {field('shop_address', 'Address')}
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('shop_phone', 'Phone', { type: 'tel' })}
                            {field('shop_email', 'Email (optional)', {
                                type: 'email',
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pricing rules</CardTitle>
                        <CardDescription>
                            Apply to new orders only; saved orders keep their
                            totals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {field(
                            'express_surcharge_percent',
                            'Express surcharge (%)',
                            {
                                type: 'number',
                                min: 0,
                                step: 1,
                                className: 'text-right tabular-nums',
                            },
                            `A ${money(200, symbol)} order costs ${money(200 * (1 + surcharge / 100), symbol)} as express.`,
                        )}
                        {field(
                            'default_delivery_fee',
                            `Fee per pickup/delivery trip (${symbol})`,
                            {
                                type: 'number',
                                min: 0,
                                step: 0.01,
                                className: 'text-right tabular-nums',
                            },
                        )}
                        {field('currency_symbol', 'Currency symbol', {
                            maxLength: 5,
                        })}
                        {field('currency_code', 'Currency code', {
                            maxLength: 3,
                            className: 'uppercase',
                        })}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Unclaimed laundry</CardTitle>
                        <CardDescription>
                            Automatic reminders for laundry left on the shelf.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {field(
                            'unclaimed_after_days',
                            'First reminder after (days ready)',
                            {
                                type: 'number',
                                min: 1,
                                className: 'text-right tabular-nums',
                            },
                        )}
                        {field(
                            'reminder_interval_days',
                            'Then remind every (days)',
                            {
                                type: 'number',
                                min: 1,
                                className: 'text-right tabular-nums',
                            },
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Customer notifications</CardTitle>
                        <CardDescription>
                            Order received, ready, out for delivery, completed
                            and reminders.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Label
                            htmlFor="sms_enabled"
                            className="flex items-center justify-between gap-4 font-normal"
                        >
                            <span className="grid gap-1">
                                <span className="flex items-center gap-2 font-medium">
                                    <MessageSquare className="size-4" /> Text
                                    messages (SMS)
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Sent to the customer's mobile number.
                                </span>
                            </span>
                            <Switch
                                id="sms_enabled"
                                checked={form.data.sms_enabled}
                                onCheckedChange={(checked) =>
                                    form.setData('sms_enabled', checked)
                                }
                            />
                        </Label>
                        <InputError message={form.errors.sms_enabled} />

                        {smsDriver === 'log' ? (
                            <Alert>
                                <Info />
                                <AlertDescription>
                                    <span>
                                        <Badge
                                            variant="secondary"
                                            className="mr-1"
                                        >
                                            Log only
                                        </Badge>
                                        SMS are written to the log, not sent.
                                        Set{' '}
                                        <code className="font-mono text-xs">
                                            SMS_DRIVER=semaphore
                                        </code>{' '}
                                        and{' '}
                                        <code className="font-mono text-xs">
                                            SEMAPHORE_API_KEY
                                        </code>{' '}
                                        in{' '}
                                        <code className="font-mono text-xs">
                                            .env
                                        </code>{' '}
                                        to send real messages.
                                    </span>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Sending through{' '}
                                <Badge variant="outline" className="capitalize">
                                    {smsDriver}
                                </Badge>
                            </p>
                        )}

                        <Label
                            htmlFor="email_enabled"
                            className="flex items-center justify-between gap-4 font-normal"
                        >
                            <span className="grid gap-1">
                                <span className="font-medium">Email</span>
                                <span className="text-xs text-muted-foreground">
                                    Only for customers with an email address.
                                </span>
                            </span>
                            <Switch
                                id="email_enabled"
                                checked={form.data.email_enabled}
                                onCheckedChange={(checked) =>
                                    form.setData('email_enabled', checked)
                                }
                            />
                        </Label>
                        <InputError message={form.errors.email_enabled} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Receipt</CardTitle>
                        <CardDescription>
                            Footer printed at the bottom of every receipt.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="receipt_footer">Footer text</Label>
                            <Textarea
                                id="receipt_footer"
                                rows={3}
                                value={form.data.receipt_footer}
                                onChange={(event) =>
                                    form.setData(
                                        'receipt_footer',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={form.errors.receipt_footer} />
                        </div>

                        {/* Live preview of the receipt header and footer (80 mm roll). */}
                        <div className="mx-auto w-full max-w-[280px] rounded-md border bg-white p-4 font-mono text-[11px] leading-snug text-neutral-900 shadow-xs">
                            <p className="text-center text-xs font-bold">
                                {form.data.shop_name || 'Shop name'}
                            </p>
                            <p className="text-center">
                                {form.data.shop_address}
                            </p>
                            <p className="text-center">
                                {form.data.shop_phone}
                            </p>
                            <div className="my-2 border-t border-dashed border-neutral-400" />
                            <div className="flex justify-between">
                                <span>Wash, Dry &amp; Fold 5 kg</span>
                                <span>{money(175, symbol)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>TOTAL</span>
                                <span>{money(175, symbol)}</span>
                            </div>
                            <div className="my-2 border-t border-dashed border-neutral-400" />
                            <p
                                className={cn(
                                    'text-center',
                                    !form.data.receipt_footer &&
                                        'text-neutral-400',
                                )}
                            >
                                {form.data.receipt_footer ||
                                    'Footer text appears here'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="size-4" aria-hidden /> Website
                        </CardTitle>
                        <CardDescription>
                            Shown on the public website, its footer and in
                            Google.{' '}
                            <a
                                href={home.url()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                            >
                                View website
                                <ExternalLink className="size-3" aria-hidden />
                            </a>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <ShopLogoField />

                        {field('shop_tagline', 'Tagline', {
                            maxLength: 120,
                            placeholder: 'Fresh, clean, and on time.',
                        })}
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field(
                                'shop_city',
                                'City, province',
                                { placeholder: 'Quezon City, Metro Manila' },
                                'The part before the comma is used in headlines.',
                            )}
                            {field('service_area', 'Service area', {
                                placeholder:
                                    'Pickup and delivery within 5 km of the shop',
                            })}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field(
                                'business_hours',
                                'Business hours (shown to visitors)',
                                {
                                    placeholder:
                                        'Mon–Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 5:00 PM',
                                },
                                'Separate days with “·” to show them on separate lines.',
                            )}
                            {field(
                                'opening_hours_schema',
                                'Opening hours for Google',
                                {
                                    placeholder:
                                        'Mo-Sa 07:00-20:00, Su 08:00-17:00',
                                    className: 'font-mono',
                                },
                                'Format: Mo-Sa 07:00-20:00, Su 08:00-17:00 (24-hour time). Also drives the “Open now” badge.',
                            )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {field('founded_year', 'Year founded', {
                                type: 'number',
                                min: 1950,
                                max: new Date().getFullYear(),
                                className: 'tabular-nums',
                            })}
                            {field(
                                'pickup_slot_capacity',
                                'Pickups per time slot',
                                {
                                    type: 'number',
                                    min: 1,
                                    max: 50,
                                    className: 'text-right tabular-nums',
                                },
                                'How many pickups the riders can handle at 9 AM, 1 PM and 4 PM.',
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="about_text">About text</Label>
                            <Textarea
                                id="about_text"
                                rows={4}
                                maxLength={3000}
                                value={form.data.about_text}
                                onChange={(event) =>
                                    form.setData(
                                        'about_text',
                                        event.target.value,
                                    )
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                The “Our story” paragraph on the About page.
                            </p>
                            <InputError message={form.errors.about_text} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            {field('facebook_url', 'Facebook page', {
                                type: 'url',
                                placeholder: 'https://www.facebook.com/…',
                            })}
                            {field('messenger_url', 'Messenger link', {
                                type: 'url',
                                placeholder: 'https://m.me/…',
                            })}
                            {field('instagram_url', 'Instagram', {
                                type: 'url',
                                placeholder: 'https://www.instagram.com/…',
                            })}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="map_embed_url">
                                Google Maps embed URL
                            </Label>
                            <Input
                                id="map_embed_url"
                                value={form.data.map_embed_url}
                                onChange={(event) =>
                                    form.setData(
                                        'map_embed_url',
                                        embedSrc(event.target.value),
                                    )
                                }
                                placeholder="https://www.google.com/maps/embed?pb=…"
                            />
                            <p className="text-xs text-muted-foreground">
                                How to get this: open your shop in Google Maps →
                                Share → Embed a map → Copy HTML, then paste it
                                here (only the link is kept). Leave it empty to
                                hide the map.
                            </p>
                            <InputError message={form.errors.map_embed_url} />
                        </div>
                        {field(
                            'map_link',
                            'Google Maps link (for “Get directions”)',
                            {
                                type: 'url',
                                placeholder: 'https://maps.google.com/?q=…',
                            },
                        )}
                    </CardContent>
                </Card>

                {/* Sticky save bar once something changed. */}
                <div
                    className={cn(
                        'sticky bottom-4 flex items-center justify-end gap-3 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur',
                        !form.isDirty &&
                            'border-transparent bg-transparent shadow-none',
                    )}
                >
                    {form.isDirty && (
                        <span className="mr-auto text-sm text-muted-foreground">
                            You have unsaved changes.
                        </span>
                    )}
                    {form.isDirty && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => form.reset()}
                        >
                            Discard
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={form.processing || !form.isDirty}
                    >
                        {form.processing && <Spinner />}
                        Save changes
                    </Button>
                </div>
            </form>
        </>
    );
}

ShopSettings.layout = {
    breadcrumbs: [
        {
            title: 'Shop settings',
            href: edit(),
        },
    ],
};
