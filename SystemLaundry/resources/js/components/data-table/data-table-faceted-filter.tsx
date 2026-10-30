import { Check, PlusCircle } from 'lucide-react';
import type { ComponentType } from 'react';
import { useTableQuery } from '@/components/data-table/use-table-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export type FacetOption = {
    value: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    count?: number;
};

/**
 * Multi-select filter (Popover + Command + checkboxes) stored in the URL as "a,b,c".
 * With `single`, picking an option replaces the previous one.
 */
export function DataTableFacetedFilter({
    paramKey,
    title,
    options,
    single = false,
}: {
    paramKey: string;
    title: string;
    options: FacetOption[];
    single?: boolean;
}) {
    const { get, setParams } = useTableQuery();
    const selected = new Set((get(paramKey) ?? '').split(',').filter(Boolean));

    const toggle = (value: string) => {
        const next = single ? new Set<string>() : new Set(selected);

        if (selected.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }

        setParams({ [paramKey]: [...next].join(',') || null });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-dashed"
                >
                    <PlusCircle />
                    {title}
                    {selected.size > 0 && (
                        <>
                            <Separator
                                orientation="vertical"
                                className="mx-1 h-4"
                            />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {selected.size}
                            </Badge>
                            <div className="hidden gap-1 lg:flex">
                                {selected.size > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {selected.size} selected
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) =>
                                            selected.has(option.value),
                                        )
                                        .map((option) => (
                                            <Badge
                                                key={option.value}
                                                variant="secondary"
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>No results.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selected.has(option.value);

                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => toggle(option.value)}
                                    >
                                        <div
                                            className={cn(
                                                'flex size-4 items-center justify-center rounded-[4px] border',
                                                isSelected
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-input [&_svg]:invisible',
                                            )}
                                        >
                                            <Check className="size-3.5 text-primary-foreground" />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="size-4 text-muted-foreground" />
                                        )}
                                        <span>{option.label}</span>
                                        {option.count !== undefined && (
                                            <span className="ml-auto font-mono text-xs text-muted-foreground">
                                                {option.count}
                                            </span>
                                        )}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {selected.size > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() =>
                                            setParams({ [paramKey]: null })
                                        }
                                        className="justify-center text-center"
                                    >
                                        Clear filter
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
