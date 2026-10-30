import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { InfoBar } from '@/components/public/info-bar';
import { MobileActionBar } from '@/components/public/mobile-action-bar';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteNavbar } from '@/components/public/site-navbar';
import { cn } from '@/lib/utils';

/** Pages that get the phone Call + Book bar (docs/public-site/04 §2.3). */
const pagesWithActionBar = ['public/home', 'public/pricing'];

/**
 * Public website shell: skip link, info bar, sticky navbar, page, footer.
 */
export default function PublicSiteLayout({
    children,
}: {
    children: ReactNode;
}) {
    const { component } = usePage();
    const actionBar = pagesWithActionBar.includes(component);

    return (
        <div
            className={cn(
                'flex min-h-svh flex-col bg-background text-base',
                actionBar && 'pb-20 md:pb-0',
            )}
        >
            <a
                href="#main"
                className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
                Skip to main content
            </a>
            <InfoBar />
            <SiteNavbar />
            <main id="main" tabIndex={-1} className="flex-1 outline-none">
                {children}
            </main>
            <SiteFooter />
            {actionBar && <MobileActionBar />}
        </div>
    );
}
