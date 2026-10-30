import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { SiteFooter } from '@/components/public/site-footer';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from '@/components/ui/card';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/**
 * login-03 block in the website's look: shop logo + name above a centered card, a link
 * back to the website, and the public footer. Used by every auth page (login, register,
 * password reset, 2FA, ...). Pages without a layout title render their own heading.
 */
export default function AuthCardShellLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { site, shop, name } = usePage().props;
    const shopName = site?.name ?? shop?.name ?? name;

    return (
        <div className="flex min-h-svh flex-col bg-muted">
            <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="flex w-full max-w-sm flex-col gap-6">
                    <Link
                        href={home()}
                        className="flex items-center gap-2.5 self-center rounded-md text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        {site?.logo_url ? (
                            <img
                                src={site.logo_url}
                                alt=""
                                width={36}
                                height={36}
                                className="size-9 rounded-lg object-contain"
                            />
                        ) : (
                            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                        )}
                        {shopName}
                    </Link>

                    <Card>
                        {(title || description) && (
                            <CardHeader className="text-center">
                                {title && (
                                    <h1 className="text-xl leading-none font-semibold">
                                        {title}
                                    </h1>
                                )}
                                {description && (
                                    <CardDescription>
                                        {description}
                                    </CardDescription>
                                )}
                            </CardHeader>
                        )}
                        <CardContent>{children}</CardContent>
                    </Card>

                    <Link
                        href={home()}
                        className="inline-flex items-center gap-1.5 self-center text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" aria-hidden />
                        Back to website
                    </Link>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
