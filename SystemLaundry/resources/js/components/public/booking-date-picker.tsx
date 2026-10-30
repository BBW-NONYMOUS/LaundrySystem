import { format, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { isoDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BookableDate } from '@/types/public';

/** Number of day chips before "More dates". */
const CHIPS = 7;

/**
 * The first bookable dates from the server, which always start with today (Manila).
 */
export function dateChipLabel(dates: BookableDate[], date: string): string {
    const index = dates.findIndex((entry) => entry.date === date);

    if (index === 0) {
        return 'Today';
    }

    if (index === 1) {
        return 'Tomorrow';
    }

    return format(parseISO(date), 'EEE d');
}

/**
 * Pickup date: a scrollable row of day chips for the next week plus "More dates", a
 * calendar limited to the booking window. Fully booked days are disabled.
 */
export function BookingDatePicker({
    id,
    dates,
    value,
    onChange,
    describedBy,
}: {
    id: string;
    dates: BookableDate[];
    value: string;
    onChange: (date: string) => void;
    describedBy?: string;
}) {
    const [open, setOpen] = useState(false);
    const chips = dates.slice(0, CHIPS);
    const inChips = chips.some((entry) => entry.date === value);
    const bookable = new Set(
        dates.filter((entry) => entry.available).map((entry) => entry.date),
    );
    const first = dates[0] ? parseISO(dates[0].date) : undefined;
    const last = dates.at(-1) ? parseISO(dates.at(-1)!.date) : undefined;

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ScrollArea className="-mx-1 min-w-0 flex-1">
                <ToggleGroup
                    id={id}
                    type="single"
                    variant="outline"
                    value={inChips ? value : ''}
                    onValueChange={(next) => next && onChange(next)}
                    aria-label="Pickup date"
                    aria-describedby={describedBy}
                    className="w-max gap-2 p-1"
                >
                    {chips.map((entry) => (
                        <ToggleGroupItem
                            key={entry.date}
                            value={entry.date}
                            disabled={!entry.available}
                            aria-label={`${format(parseISO(entry.date), 'EEEE, MMMM d')}${entry.available ? '' : ', fully booked'}`}
                            className="h-auto min-w-[4.75rem] flex-col gap-0 rounded-lg! border px-3 py-2 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                            <span className="text-sm font-semibold">
                                {dateChipLabel(dates, entry.date)}
                            </span>
                            <span className="text-xs opacity-80">
                                {entry.available
                                    ? format(parseISO(entry.date), 'MMM d')
                                    : 'Full'}
                            </span>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className={cn(
                            'h-11 shrink-0',
                            !inChips &&
                                value &&
                                'border-primary bg-primary/5 text-primary',
                        )}
                    >
                        <CalendarDays aria-hidden />
                        {!inChips && value
                            ? format(parseISO(value), 'EEE, MMM d')
                            : 'More dates'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        mode="single"
                        selected={value ? parseISO(value) : undefined}
                        defaultMonth={value ? parseISO(value) : first}
                        startMonth={first}
                        endMonth={last}
                        disabled={(day) => !bookable.has(isoDate(day))}
                        onSelect={(day) => {
                            if (day) {
                                onChange(isoDate(day));
                                setOpen(false);
                            }
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
