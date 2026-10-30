import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { isoDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Single date as "yyyy-MM-dd" (what Laravel's date rule expects).
 */
export function DatePicker({
    value,
    onChange,
    placeholder = 'Pick a date',
    disablePast = false,
    id,
    className,
}: {
    value: string | null | undefined;
    onChange: (value: string) => void;
    placeholder?: string;
    disablePast?: boolean;
    id?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = value ? parseISO(value) : undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    className={cn(
                        'w-full justify-start font-normal',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon />
                    {selected
                        ? format(selected, 'EEE, MMM d, yyyy')
                        : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    defaultMonth={selected}
                    disabled={disablePast ? { before: today } : undefined}
                    onSelect={(date) => {
                        if (date) {
                            onChange(isoDate(date));
                            setOpen(false);
                        }
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}

/**
 * From/to range for report and list filters.
 */
export function DateRangePicker({
    from,
    to,
    onChange,
    placeholder = 'Any date',
    className,
}: {
    from: string | null | undefined;
    to: string | null | undefined;
    onChange: (range: { from: string | null; to: string | null }) => void;
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const range: DateRange | undefined = from
        ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
        : undefined;

    const label = range?.from
        ? range.to && isoDate(range.to) !== isoDate(range.from)
            ? `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d, yyyy')}`
            : format(range.from, 'MMM d, yyyy')
        : placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-8 justify-start border-dashed font-normal',
                        !range && 'text-muted-foreground',
                        className,
                    )}
                >
                    <CalendarIcon />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={range}
                    defaultMonth={range?.from}
                    onSelect={(next) => {
                        onChange({
                            from: next?.from ? isoDate(next.from) : null,
                            to: next?.to
                                ? isoDate(next.to)
                                : next?.from
                                  ? isoDate(next.from)
                                  : null,
                        });
                    }}
                />
                {range && (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                onChange({ from: null, to: null });
                                setOpen(false);
                            }}
                        >
                            Clear dates
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
