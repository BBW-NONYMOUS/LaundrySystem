import {
    differenceInCalendarDays,
    format,
    formatDistanceToNowStrict,
    isToday,
    isTomorrow,
    isYesterday,
    parseISO,
} from 'date-fns';

/**
 * One formatter for every amount on screen: ₱1,234.50 (always 2 decimals).
 */
export function money(amount: number | null | undefined, symbol = '₱'): string {
    const value = amount ?? 0;
    const formatted = Math.abs(value).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return `${value < 0 ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Quantities without trailing zeros: 5.20 kg → "5.2 kg", 3.00 pc → "3 pc".
 */
export function quantity(value: number, unit?: string): string {
    const text = Number(value.toFixed(2)).toString();

    return unit ? `${text} ${unit}` : text;
}

export function number(value: number): string {
    return value.toLocaleString('en-PH');
}

function toDate(value: string | Date): Date {
    return typeof value === 'string' ? parseISO(value) : value;
}

/** "Oct 23, 2:30 PM" */
export function dateTime(value: string | Date | null | undefined): string {
    return value ? format(toDate(value), 'MMM d, h:mm a') : '—';
}

/** "Oct 23, 2026" */
export function date(value: string | Date | null | undefined): string {
    return value ? format(toDate(value), 'MMM d, yyyy') : '—';
}

/** "2:30 PM" */
export function time(value: string | Date | null | undefined): string {
    return value ? format(toDate(value), 'h:mm a') : '—';
}

/** "Today 2:30 PM", "Tomorrow 9:00 AM", "Fri 1:00 PM", "Oct 30, 9:00 AM" */
export function friendlyDateTime(
    value: string | Date | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    const d = toDate(value);

    if (isToday(d)) {
        return `Today ${format(d, 'h:mm a')}`;
    }

    if (isTomorrow(d)) {
        return `Tomorrow ${format(d, 'h:mm a')}`;
    }

    if (isYesterday(d)) {
        return `Yesterday ${format(d, 'h:mm a')}`;
    }

    return Math.abs(differenceInCalendarDays(d, new Date())) < 7
        ? format(d, 'EEE h:mm a')
        : format(d, 'MMM d, h:mm a');
}

/** "in 3 hours", "2 days ago" */
export function relative(value: string | Date | null | undefined): string {
    return value
        ? formatDistanceToNowStrict(toDate(value), { addSuffix: true })
        : '—';
}

/** Hours until a date (negative when past). */
export function hoursUntil(
    value: string | Date | null | undefined,
): number | null {
    return value ? (toDate(value).getTime() - Date.now()) / 3_600_000 : null;
}

/** Value for <input type="date"> */
export function isoDate(value: Date): string {
    return format(value, 'yyyy-MM-dd');
}
