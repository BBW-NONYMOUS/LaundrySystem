import { router } from '@inertiajs/react';
import { ClipboardList, Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { useDebounce } from '@/hooks/use-debounce';
import { useHotkey } from '@/hooks/use-hotkey';
import { usePermissions } from '@/hooks/use-permissions';
import { navGroups, newOrderLink } from '@/lib/navigation';
import type { NavLink } from '@/lib/navigation';
import { searchEverything } from '@/lib/search';
import type { CustomerHit, OrderHit } from '@/lib/search';
import { show as showCustomer } from '@/routes/customers';
import { show as showOrder } from '@/routes/orders';
import { index as scanPage } from '@/routes/scan';

/**
 * Ctrl/⌘+K: search orders and customers, jump to any page, start a new order.
 * Also owns the global Alt+N (new order) and Alt+S (scan) shortcuts.
 */
export function CommandMenu() {
    const { can } = usePermissions();
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const debounced = useDebounce(term, 200);
    const [results, setResults] = useState<{
        customers: CustomerHit[];
        orders: OrderHit[];
    }>({
        customers: [],
        orders: [],
    });

    useHotkey('mod+k', () => setOpen((value) => !value), {
        allowInInputs: true,
    });
    useHotkey('alt+n', () => router.visit(newOrderLink.href), {
        enabled: can('orders.create'),
    });
    useHotkey('alt+s', () => router.visit(scanPage()), {
        enabled: can('orders.update-status'),
    });

    useEffect(() => {
        if (!open || !can('orders.view', 'customers.view')) {
            return;
        }

        const controller = new AbortController();
        searchEverything(debounced, controller.signal)
            .then(setResults)
            .catch(() => undefined);

        return () => controller.abort();
    }, [debounced, open, can]);

    const go = (href: NavLink['href']) => {
        setOpen(false);
        setTerm('');
        router.visit(href);
    };

    const needle = term.trim().toLowerCase();
    const pages = navGroups
        .flatMap((group) => group.items)
        .filter((item) => can(...item.can))
        .filter(
            (item) =>
                needle === '' ||
                [item.title, ...(item.keywords ?? [])].some((text) =>
                    text.toLowerCase().includes(needle),
                ),
        );
    const showNewOrder =
        can(...newOrderLink.can) &&
        (needle === '' || 'new order'.includes(needle));

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-8 w-9 justify-start px-2 text-muted-foreground sm:w-56 sm:px-3"
                onClick={() => setOpen(true)}
                aria-label="Search (Ctrl+K)"
            >
                <Search />
                <span className="hidden sm:inline">
                    Search orders, customers…
                </span>
                <Kbd className="ml-auto hidden sm:inline-flex">Ctrl K</Kbd>
            </Button>

            <CommandDialog
                open={open}
                onOpenChange={(value) => {
                    setOpen(value);
                    if (!value) {
                        setTerm('');
                    }
                }}
                title="Search"
                description="Search orders and customers or jump to a page"
            >
                {/* Results come from the server, so cmdk's own filtering is turned off. */}
                <CommandInput
                    placeholder="Order #, customer name or mobile, or a page…"
                    value={term}
                    onValueChange={setTerm}
                />
                <CommandList>
                    <CommandEmpty>No matches.</CommandEmpty>

                    {results.orders.length > 0 && (
                        <CommandGroup heading="Orders">
                            {results.orders.map((order) => (
                                <CommandItem
                                    key={`order-${order.id}`}
                                    value={`order-${order.id}`}
                                    onSelect={() => go(showOrder(order.id))}
                                >
                                    <ClipboardList />
                                    <span className="font-mono text-xs">
                                        {order.order_number}
                                    </span>
                                    <span className="truncate text-muted-foreground">
                                        {order.customer_name}
                                    </span>
                                    <StatusBadge
                                        status={order.status}
                                        className="ml-auto"
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {results.customers.length > 0 && (
                        <CommandGroup heading="Customers">
                            {results.customers.map((customer) => (
                                <CommandItem
                                    key={`customer-${customer.id}`}
                                    value={`customer-${customer.id}`}
                                    onSelect={() =>
                                        go(showCustomer(customer.id))
                                    }
                                >
                                    <UserRound />
                                    <span>{customer.name}</span>
                                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                                        {customer.phone}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {(results.orders.length > 0 ||
                        results.customers.length > 0) && <CommandSeparator />}

                    {showNewOrder && (
                        <CommandGroup heading="Actions">
                            <CommandItem
                                value="action-new-order"
                                onSelect={() => go(newOrderLink.href)}
                            >
                                <newOrderLink.icon />
                                New order
                                <CommandShortcut>Alt+N</CommandShortcut>
                            </CommandItem>
                        </CommandGroup>
                    )}

                    {pages.length > 0 && (
                        <CommandGroup heading="Go to">
                            {pages.map((item) => (
                                <CommandItem
                                    key={item.title}
                                    value={`page-${item.title}`}
                                    onSelect={() => go(item.href)}
                                >
                                    <item.icon />
                                    {item.title}
                                    {item.shortcut && (
                                        <CommandShortcut>
                                            {item.shortcut}
                                        </CommandShortcut>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
