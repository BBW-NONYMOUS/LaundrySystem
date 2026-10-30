import { Link, usePage } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { Menu, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OpenStatus } from '@/components/public/open-status';
import { Container } from '@/components/public/section';
import { SiteLogo } from '@/components/public/site-logo';
import { Button } from '@/components/ui/button';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { displayPhone, telHref } from '@/lib/public-site';
import { cn } from '@/lib/utils';
import { dashboard, home, login, register } from '@/routes';
import { index as portal } from '@/routes/portal';
import { about, book, contact, faq, pricing, track } from '@/routes/public';
import { index as riderTrips } from '@/routes/rider/deliveries';

type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    /** In-page anchor on Home ("How It Works"). */
    anchor?: string;
};

export const publicNavItems: NavItem[] = [
    { title: 'Services & Pricing', href: pricing() },
    { title: 'How It Works', href: home(), anchor: 'how-it-works' },
    { title: 'About', href: about() },
    { title: 'FAQ', href: faq() },
    { title: 'Contact', href: contact() },
];

/** "Log in", or where a signed-in person goes next (portal / dashboard / trips). */
export function useAccountLink(): {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
} {
    const { auth } = usePage().props;
    // Error pages rendered outside the web middleware may have no auth prop.
    const user = (auth?.user ?? null) as typeof auth.user | null;

    if (!user) {
        return { title: 'Log in', href: login() };
    }

    if (user.role === 'customer') {
        return { title: 'My Orders', href: portal() };
    }

    if (user.role === 'rider') {
        return { title: 'My Trips', href: riderTrips() };
    }

    return { title: 'Dashboard', href: dashboard() };
}

function NavAnchor({
    item,
    className,
    onHome,
}: {
    item: NavItem;
    className?: string;
    onHome: boolean;
}) {
    // On Home itself the anchor just scrolls; from other pages it visits Home first.
    if (item.anchor && onHome) {
        return (
            <a href={`#${item.anchor}`} className={className}>
                {item.title}
            </a>
        );
    }

    const href = item.anchor
        ? `${typeof item.href === 'string' ? item.href : item.href.url}#${item.anchor}`
        : item.href;

    return (
        <Link href={href} className={className}>
            {item.title}
        </Link>
    );
}

/**
 * Sticky public navbar: NavigationMenu on desktop, Sheet menu on phones and tablets
 * (docs/public-site/04 §2.2).
 */
export function SiteNavbar() {
    const { site, auth } = usePage().props;
    const page = usePage();
    const { isCurrentUrl } = useCurrentUrl();
    const account = useAccountLink();
    const [scrolled, setScrolled] = useState(false);
    const onHome = page.component === 'public/home';
    const signedIn = Boolean(auth?.user);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 4);

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const isActive = (item: NavItem) => !item.anchor && isCurrentUrl(item.href);

    return (
        <header
            className={cn(
                'sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75',
                scrolled ? 'border-border shadow-xs' : 'border-transparent',
            )}
        >
            <Container className="flex h-16 items-center justify-between gap-4">
                <SiteLogo compact />

                <NavigationMenu
                    viewport={false}
                    className="hidden lg:flex"
                    aria-label="Main"
                >
                    <NavigationMenuList>
                        {publicNavItems.map((item) => (
                            <NavigationMenuItem key={item.title}>
                                <NavigationMenuLink
                                    asChild
                                    active={isActive(item)}
                                    className={cn(
                                        navigationMenuTriggerStyle(),
                                        'bg-transparent data-[active=true]:text-primary',
                                    )}
                                >
                                    <NavAnchor item={item} onHome={onHome} />
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="hidden lg:inline-flex"
                    >
                        <Link href={account.href}>{account.title}</Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="hidden md:inline-flex"
                    >
                        <Link href={track()}>Track Order</Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href={book()}>Book Now</Link>
                    </Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                aria-label="Open menu"
                            >
                                <Menu />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[85vw] max-w-sm gap-0"
                        >
                            <SheetHeader className="border-b">
                                <SheetTitle>{site.name}</SheetTitle>
                                <SheetDescription className="sr-only">
                                    Site menu
                                </SheetDescription>
                            </SheetHeader>
                            <nav
                                aria-label="Mobile"
                                className="flex flex-col gap-1 overflow-y-auto p-4"
                            >
                                {[
                                    { title: 'Home', href: home() },
                                    ...publicNavItems,
                                ].map((item) => (
                                    <SheetClose asChild key={item.title}>
                                        <NavAnchor
                                            item={item}
                                            onHome={onHome}
                                            className={cn(
                                                'rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent',
                                                isActive(item) &&
                                                    'bg-accent text-primary',
                                            )}
                                        />
                                    </SheetClose>
                                ))}

                                <Separator className="my-3" />

                                <div className="grid gap-2">
                                    <SheetClose asChild>
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="h-11"
                                        >
                                            <Link href={track()}>
                                                Track My Order
                                            </Link>
                                        </Button>
                                    </SheetClose>
                                    <SheetClose asChild>
                                        <Button asChild className="h-11">
                                            <Link href={book()}>
                                                Book a Pickup
                                            </Link>
                                        </Button>
                                    </SheetClose>
                                </div>
                                <p className="mt-3 text-center text-sm text-muted-foreground">
                                    <Link
                                        href={account.href}
                                        className="font-medium text-foreground hover:underline"
                                    >
                                        {account.title}
                                    </Link>
                                    {!signedIn && (
                                        <>
                                            {' · '}
                                            <Link
                                                href={register()}
                                                className="font-medium text-foreground hover:underline"
                                            >
                                                Create account
                                            </Link>
                                        </>
                                    )}
                                </p>

                                <Separator className="my-3" />

                                <div className="grid gap-3 px-3 text-sm text-muted-foreground">
                                    <OpenStatus />
                                    {site.phone && (
                                        <a
                                            href={telHref(site.phone)}
                                            className="inline-flex items-center gap-2 font-medium text-foreground"
                                        >
                                            <Phone
                                                className="size-4"
                                                aria-hidden
                                            />
                                            Call {displayPhone(site.phone)}
                                        </a>
                                    )}
                                </div>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </Container>
        </header>
    );
}
