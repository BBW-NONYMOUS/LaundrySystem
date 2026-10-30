import { usePage } from '@inertiajs/react';
import { WashingMachine } from 'lucide-react';

/**
 * Shop name from Settings next to the brand mark (sidebar header).
 */
export default function AppLogo() {
    const { shop, name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <WashingMachine className="size-5" aria-hidden />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {shop?.name ?? name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                    Laundry system
                </span>
            </div>
        </>
    );
}
