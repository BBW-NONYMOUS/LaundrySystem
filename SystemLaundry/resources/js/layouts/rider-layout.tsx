import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import { AppearanceToggle } from '@/components/appearance-toggle';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';
import { edit as profile } from '@/routes/profile';
import { index as myTrips } from '@/routes/rider/deliveries';

/**
 * Phone-first shell for riders: slim top bar, one column, big touch targets.
 */
export default function RiderLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-svh flex-col bg-muted/40">
            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
                <Link
                    href={myTrips()}
                    className="flex min-w-0 flex-1 items-center gap-1"
                >
                    <AppLogo />
                </Link>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                    {auth.user.name}
                </span>
                <AppearanceToggle />
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    asChild
                    aria-label="Settings"
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
            </header>
            <main className="mx-auto w-full max-w-2xl flex-1 p-4">
                {children}
            </main>
        </div>
    );
}
