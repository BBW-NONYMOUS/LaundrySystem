import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import { AppearanceToggle } from '@/components/appearance-toggle';
import { Button } from '@/components/ui/button';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { index as portalHome } from '@/routes/portal';
import { create as bookPickup } from '@/routes/portal/bookings';
import { edit as profile } from '@/routes/profile';

/**
 * Customer portal: top navigation instead of a sidebar.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;
    const { isCurrentUrl } = useCurrentUrl();
    const links = [
        { title: 'My orders', href: portalHome() },
        { title: 'Book a pickup', href: bookPickup() },
    ];

    return (
        <div className="flex min-h-svh flex-col bg-muted/40">
            <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
                    <Link
                        href={portalHome()}
                        className="flex min-w-0 items-center gap-1"
                    >
                        <AppLogo />
                    </Link>
                    <NavigationMenu className="ml-2 hidden sm:flex">
                        <NavigationMenuList>
                            {links.map((link) => (
                                <NavigationMenuItem key={link.title}>
                                    <NavigationMenuLink
                                        asChild
                                        active={isCurrentUrl(link.href)}
                                    >
                                        <Link
                                            href={link.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                isCurrentUrl(link.href) &&
                                                    'bg-accent',
                                            )}
                                        >
                                            {link.title}
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                    <div className="ml-auto flex items-center gap-1">
                        <span className="hidden text-sm text-muted-foreground md:inline">
                            {auth.user.name}
                        </span>
                        <AppearanceToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            asChild
                            aria-label="Account settings"
                        >
                            <Link href={profile()}>
                                <Settings />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            aria-label="Log out"
                            onClick={() => {
                                router.flushAll();
                                router.post(logout.url());
                            }}
                        >
                            <LogOut />
                        </Button>
                    </div>
                </div>
                {/* Phone: the two links as a row under the header. */}
                <nav className="flex border-t sm:hidden">
                    {links.map((link) => (
                        <Link
                            key={link.title}
                            href={link.href}
                            className={cn(
                                'flex-1 py-2.5 text-center text-sm font-medium',
                                isCurrentUrl(link.href)
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {link.title}
                        </Link>
                    ))}
                </nav>
            </header>
            <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
                {children}
            </main>
        </div>
    );
}
