import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useHotkey } from '@/hooks/use-hotkey';
import { cn } from '@/lib/utils';

/**
 * Search box that writes ?search= after typing stops (server-side search). "/" focuses it.
 */
export function SearchBox({
    placeholder,
    className,
}: {
    placeholder: string;
    className?: string;
}) {
    const { get, setParams } = useTableQuery();
    const [value, setValue] = useState(get('search') ?? '');
    const debounced = useDebounce(value, 350);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (debounced !== (get('search') ?? '')) {
            setParams({ search: debounced.trim() || null });
        }
    }, [debounced, get, setParams]);

    useHotkey('/', () => inputRef.current?.focus());

    return (
        <div className={cn('relative w-full sm:w-72', className)}>
            <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
            />
            <Input
                ref={inputRef}
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="pl-8"
            />
        </div>
    );
}
