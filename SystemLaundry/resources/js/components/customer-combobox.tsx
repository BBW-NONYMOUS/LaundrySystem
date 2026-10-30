import { Check, ChevronsUpDown, UserPlus, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { useDebounce } from '@/hooks/use-debounce';
import { searchEverything } from '@/lib/search';
import type { CustomerHit } from '@/lib/search';
import { cn } from '@/lib/utils';

/**
 * Search-first customer picker (Popover + Command). Staff never free-type a name for an
 * existing customer, which is what stops misspelled duplicates. The last option creates a
 * new customer from what was typed.
 */
export function CustomerCombobox({
    value,
    onSelect,
    onCreateNew,
    id,
    invalid,
    autoFocus,
}: {
    value: CustomerHit | null;
    onSelect: (customer: CustomerHit | null) => void;
    /** Called with the typed text when "Add as new customer" is chosen. */
    onCreateNew?: (typed: string) => void;
    id?: string;
    invalid?: boolean;
    autoFocus?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const debounced = useDebounce(term, 200);
    const [results, setResults] = useState<CustomerHit[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (autoFocus && !value) {
            setOpen(true);
        }
        // Only on first render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(debounced.trim().length >= 2);

        searchEverything(debounced, controller.signal)
            .then((found) => setResults(found.customers))
            .catch(() => undefined)
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [debounced]);

    const typed = term.trim();

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-invalid={invalid}
                    className="h-auto min-h-10 w-full justify-between py-2 font-normal"
                >
                    {value ? (
                        <span className="flex min-w-0 items-center gap-2 text-left">
                            <UserRound className="text-muted-foreground" />
                            <span className="truncate font-medium">
                                {value.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                                {value.phone}
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            Search name or mobile number…
                        </span>
                    )}
                    <ChevronsUpDown className="opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-(--radix-popover-trigger-width) min-w-80 p-0"
                align="start"
            >
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Type at least 2 letters or digits…"
                        value={term}
                        onValueChange={setTerm}
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                <Spinner /> Searching…
                            </div>
                        )}
                        {!loading &&
                            typed.length >= 2 &&
                            results.length === 0 && (
                                <CommandEmpty>
                                    No customer matches “{typed}”.
                                </CommandEmpty>
                            )}
                        {results.length > 0 && (
                            <CommandGroup heading="Customers">
                                {results.map((customer) => (
                                    <CommandItem
                                        key={customer.id}
                                        value={String(customer.id)}
                                        onSelect={() => {
                                            onSelect(customer);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                value?.id === customer.id
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <span className="truncate">
                                            {customer.name}
                                        </span>
                                        <span className="ml-auto font-mono text-xs text-muted-foreground">
                                            {customer.phone}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                        {onCreateNew && (
                            <CommandGroup>
                                <CommandItem
                                    value="__create__"
                                    onSelect={() => {
                                        onCreateNew(typed);
                                        setOpen(false);
                                    }}
                                >
                                    <UserPlus />
                                    {typed ? (
                                        <>Add “{typed}” as a new customer</>
                                    ) : (
                                        'Add a new customer'
                                    )}
                                </CommandItem>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
