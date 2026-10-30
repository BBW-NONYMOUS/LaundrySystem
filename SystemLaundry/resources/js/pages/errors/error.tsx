import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Clock,
    RefreshCw,
    Shirt,
    ShieldCheck,
    Timer,
    WashingMachine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container } from '@/components/public/section';
import { Button } from '@/components/ui/button';
import { displayPhone } from '@/lib/public-site';
import { home, login } from '@/routes';
import { book, track } from '@/routes/public';
import type { SiteSettings } from '@/types/public';

type Props = {
    status: number;
    /** Passed directly: unknown URLs fail before the shared props are added. */
    site: SiteSettings;
};

type Action = 'home' | 'track' | 'book' | 'login' | 'retry';

type ErrorCopy = {
    icon: LucideIcon;
    title: string;
    text: (phone: string) => string;
    actions: Action[];
};

/** docs/public-site/04 §12. */
const COPY: Record<number, ErrorCopy> = {
    404: {
        icon: Shirt,
        title: 'This page went missing',
        text: () =>
            'Like a sock in the dryer — it happens. The page you’re looking for doesn’t exist or was moved.',
        actions: ['home', 'track', 'book'],
    },
    403: {
        icon: ShieldCheck,
        title: 'You don’t have access to this page',
        text: () =>
            'Log in with an account that has permission, or head back to the home page.',
        actions: ['home', 'login'],
    },
    419: {
        icon: Timer,
        title: 'This page expired',
        text: () =>
            'The page was open for a long time, so we couldn’t send that. Refresh and try again.',
        actions: ['retry', 'home'],
    },
    429: {
        icon: Timer,
        title: 'Too many tries',
        text: () => 'Please wait a minute, then try again.',
        actions: ['retry', 'home'],
    },
    500: {
        icon: WashingMachine,
        title: 'Something went wrong on our side',
        text: (phone) =>
            `We’ve been notified and are fixing it. Please try again in a minute${phone ? `, or call us at ${phone}` : ''}.`,
        actions: ['retry', 'home'],
    },
    503: {
        icon: Clock,
        title: 'We’re doing quick maintenance',
        text: (phone) =>
            `We’ll be back in a few minutes.${phone ? ` Need help right now? Call us at ${phone}.` : ''}`,
        actions: ['retry'],
    },
};

/**
 * Branded error page inside the public layout, so a lost visitor can carry on.
 */
export default function ErrorPage({ status, site }: Props) {
    const shared = usePage().props.site as SiteSettings | undefined;
    const shop = site ?? shared;
    const copy = COPY[status] ?? (status >= 500 ? COPY[500] : COPY[404]);
    const Icon = copy.icon;
    const phone = displayPhone(shop?.phone ?? null);

    return (
        <>
            <Head title={copy.title}>
                <meta head-key="robots" name="robots" content="noindex" />
            </Head>
            <div className="bg-linear-to-b from-fresh-soft to-background">
                <Container className="flex min-h-[60svh] flex-col items-center justify-center gap-6 py-16 text-center md:py-24">
                    <span className="flex size-20 items-center justify-center rounded-3xl bg-background text-primary shadow-sm">
                        <Icon
                            className="size-10"
                            strokeWidth={1.5}
                            aria-hidden
                        />
                    </span>
                    <div className="grid max-w-xl gap-3">
                        <p className="font-mono text-sm text-muted-foreground">
                            Error {status}
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                            {copy.title}
                        </h1>
                        <p className="text-lg text-pretty text-muted-foreground">
                            {copy.text(phone)}
                        </p>
                    </div>
                    <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                        {copy.actions.map((action, index) => (
                            <ErrorAction
                                key={action}
                                action={action}
                                primary={index === 0}
                            />
                        ))}
                    </div>
                </Container>
            </div>
        </>
    );
}

function ErrorAction({
    action,
    primary,
}: {
    action: Action;
    primary: boolean;
}) {
    const variant = primary ? 'default' : 'outline';
    const className = 'h-11 px-6';

    if (action === 'retry') {
        return (
            <Button
                variant={variant}
                className={className}
                onClick={() => router.reload()}
            >
                <RefreshCw aria-hidden />
                Try Again
            </Button>
        );
    }

    const links = {
        home: { href: home(), label: 'Go to Home' },
        track: { href: track(), label: 'Track My Order' },
        book: { href: book(), label: 'Book a Pickup' },
        login: { href: login(), label: 'Log in' },
    };
    const link = links[action];

    return (
        <Button asChild variant={variant} className={className}>
            <Link href={link.href}>{link.label}</Link>
        </Button>
    );
}
