import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import PortalLayout from '@/layouts/portal-layout';
import PrintLayout from '@/layouts/print-layout';
import PublicSiteLayout from '@/layouts/public-site-layout';
import RiderLayout from '@/layouts/rider-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

void createInertiaApp({
    // Public pages pass a ready-made SEO title ("Pricing | Shop"); error pages add the shop
    // name; staff pages get the app name.
    title: (title, page) => {
        if (page.props.seo) {
            return title;
        }

        if (page.component.startsWith('errors/')) {
            const site = page.props.site as
                | { name?: string | null }
                | undefined;

            return `${title} | ${site?.name ?? appName}`;
        }

        return title ? `${title} - ${appName}` : appName;
    },
    // Layout per page group (docs/04-ui-ux-design.md §2).
    layout: (name) => {
        switch (true) {
            case name.startsWith('public/'):
            case name.startsWith('errors/'):
            case name.startsWith('track/'):
                return PublicSiteLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name.startsWith('rider/'):
                return RiderLayout;
            case name.startsWith('portal/'):
                return PortalLayout;
            case name === 'orders/receipt':
                return PrintLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster richColors closeButton position="top-right" />
            </TooltipProvider>
        );
    },
    progress: {
        color: 'oklch(0.52 0.17 252)',
    },
});

// This will set light / dark mode on load...
initializeTheme();
