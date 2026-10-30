import {
    BedDouble,
    Droplets,
    Footprints,
    Shirt,
    Sparkles,
    WashingMachine,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OrderStatus, Service } from '@/types/models';
import type { PricingRules } from '@/types/public';

/** Manila time for the open/closed badge, whatever the visitor's phone is set to. */
export const SHOP_TIME_ZONE = 'Asia/Manila';

/** Icon per service code; unknown (owner-added) services get the washing machine. */
const serviceIcons: Record<string, LucideIcon> = {
    WDF: WashingMachine,
    WO: Droplets,
    DO: Droplets,
    WDP: Shirt,
    IRN: Shirt,
    BED: BedDouble,
    COMF: BedDouble,
    CURT: BedDouble,
    DC: Sparkles,
    SHOE: Footprints,
};

export function serviceIcon(code: string): LucideIcon {
    return serviceIcons[code] ?? WashingMachine;
}

export type ServiceGroup = {
    key: string;
    title: string;
    description: string;
    icon: LucideIcon;
    /** Lowest active price in the group, with its unit ("kg" / "piece"). */
    from: { price: number; unit: string } | null;
    /** Express card shows the surcharge instead of a price. */
    surchargePercent?: number;
};

/**
 * The six Home service cards (docs/public-site/04 §3.5). Prices come live from the
 * services table; a group whose services are all inactive is left out.
 */
export function serviceGroups(
    services: Service[],
    rules: PricingRules,
    expressHours: number | null,
): ServiceGroup[] {
    const groups = [
        {
            key: 'wash-dry-fold',
            title: 'Wash, Dry & Fold',
            description:
                'Everyday clothes washed, tumble-dried and neatly folded, ready for your closet.',
            icon: WashingMachine,
            codes: ['WDF'],
        },
        {
            key: 'wash-or-dry',
            title: 'Wash or Dry Only',
            description:
                'Just need the machines? We wash or dry, and you take it from there.',
            icon: Droplets,
            codes: ['WO', 'DO'],
        },
        {
            key: 'ironing',
            title: 'Ironing & Pressing',
            description:
                'Crisp polos, uniforms and slacks, steam-pressed and returned on hangers.',
            icon: Shirt,
            codes: ['IRN', 'WDP'],
        },
        {
            key: 'bedding',
            title: 'Bedding & Curtains',
            description:
                'Comforters, sheets and curtains, washed separately in a hot cycle for a deeper clean.',
            icon: BedDouble,
            codes: ['BED', 'COMF', 'CURT'],
        },
        {
            key: 'dry-cleaning',
            title: 'Dry Cleaning',
            description:
                'Gentle care for barong, gowns, suits and delicate fabrics.',
            icon: Sparkles,
            codes: ['DC'],
        },
    ];

    const result: ServiceGroup[] = groups.flatMap(({ codes, ...group }) => {
        const members = services.filter((service) =>
            codes.includes(service.code),
        );

        if (members.length === 0) {
            return [];
        }

        const cheapest = members.reduce((low, service) =>
            service.price < low.price ? service : low,
        );

        return [
            {
                ...group,
                from: {
                    price: cheapest.price,
                    unit: unitWord(cheapest.pricing_unit),
                },
            },
        ];
    });

    if (expressHours !== null && rules.express_surcharge_percent > 0) {
        result.push({
            key: 'express',
            title: 'Express Service',
            description: `In a rush? Get wash, dry & fold back in as little as ${expressHours} hours.`,
            icon: Zap,
            from: null,
            surchargePercent: rules.express_surcharge_percent,
        });
    }

    return result;
}

export function unitWord(unit: Service['pricing_unit']): string {
    return unit === 'per_kg' ? 'kg' : 'piece';
}

/** Marketing prices: ₱35 (whole) or ₱37.50, never "₱35.00". */
export function peso(amount: number, symbol: string | null = '₱'): string {
    const whole = Number.isInteger(amount);

    return `${symbol ?? '₱'}${amount.toLocaleString('en-PH', {
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Trust-bar numbers are rounded DOWN so the site never overstates: 657 → "650+",
 * 1,240 → "1,200+". Under 10 the exact number is shown.
 */
export function roundedStat(value: number): string {
    if (value < 10) {
        return String(value);
    }

    const step = value >= 1000 ? 100 : 10;

    return `${(Math.floor(value / step) * step).toLocaleString('en-PH')}+`;
}

/** "Quezon City, Metro Manila" → "Quezon City". */
export function shortCity(city: string | null): string {
    return (city ?? '').split(',')[0]?.trim() ?? '';
}

/** "Pickup and delivery within 5 km of the shop" → "within 5 km of the shop". */
export function serviceAreaShort(area: string | null): string {
    return (area ?? '').replace(/^pickup (and|&) delivery\s*/i, '').trim();
}

/** 09171234567 → 0917 123 4567 (anything else is shown as typed). */
export function displayPhone(phone: string | null): string {
    const digits = (phone ?? '').replace(/\D+/g, '');

    if (/^09\d{9}$/.test(digits)) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    return phone ?? '';
}

export function telHref(phone: string | null): string {
    return `tel:${(phone ?? '').replace(/[^\d+]/g, '')}`;
}

export type Estimate = {
    subtotal: number;
    expressFee: number;
    deliveryFee: number;
    total: number;
    chargedQuantity: number;
};

/**
 * Same math as PricingService/OrderTotals: price × max(quantity, minimum), express
 * surcharge on the laundry charge, and a fee per pickup or delivery trip.
 */
export function estimate(
    service: Service | null | undefined,
    quantity: number,
    options: { express: boolean; trips: number; rules: PricingRules },
): Estimate | null {
    if (!service || !(quantity > 0)) {
        return null;
    }

    const chargedQuantity = Math.max(quantity, service.min_quantity);
    const subtotal = round(service.price * chargedQuantity);
    const expressFee =
        options.express && service.offers_express
            ? round((subtotal * options.rules.express_surcharge_percent) / 100)
            : 0;
    const deliveryFee = round(
        options.trips * options.rules.delivery_fee_per_trip,
    );

    return {
        subtotal,
        expressFee,
        deliveryFee,
        total: round(subtotal + expressFee + deliveryFee),
        chargedQuantity,
    };
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------------------
// Opening hours ("Mo-Sa 07:00-20:00, Su 08:00-17:00")
// ---------------------------------------------------------------------------

const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

type DayHours = { open: number; close: number };

/** Minutes after midnight per weekday (0 = Sunday); missing days are closed. */
export function parseOpeningHours(
    schema: string | null,
): Map<number, DayHours[]> {
    const week = new Map<number, DayHours[]>();

    for (const part of (schema ?? '').split(',')) {
        const match = part
            .trim()
            .match(
                /^([A-Z][a-z])(?:-([A-Z][a-z]))?\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/,
            );

        if (!match) {
            continue;
        }

        const [, from, to, oh, om, ch, cm] = match;
        const start = DAY_CODES.indexOf(from);
        const end = DAY_CODES.indexOf(to ?? from);

        if (start < 0 || end < 0) {
            continue;
        }

        const hours = {
            open: Number(oh) * 60 + Number(om),
            close: Number(ch) * 60 + Number(cm),
        };

        // Ranges may wrap around the week (e.g. "Sa-Mo").
        for (let offset = 0; offset < 7; offset++) {
            const day = (start + offset) % 7;
            week.set(day, [...(week.get(day) ?? []), hours]);

            if (day === end) {
                break;
            }
        }
    }

    return week;
}

export type OpenStatus = {
    isOpen: boolean;
    /** "until 8:00 PM" / "opens at 7:00 AM" / "opens Monday at 7:00 AM". */
    detail: string;
};

/** Current weekday and minute of the day in Manila. */
function manilaNow(now: Date): { day: number; minutes: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: SHOP_TIME_ZONE,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? '';

    return {
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
            get('weekday'),
        ),
        minutes: Number(get('hour')) * 60 + Number(get('minute')),
    };
}

export function clockLabel(minutes: number): string {
    const hour = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';

    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Null when no opening hours are set (the badge is then hidden). */
export function openStatus(
    schema: string | null,
    now: Date = new Date(),
): OpenStatus | null {
    const week = parseOpeningHours(schema);

    if (week.size === 0) {
        return null;
    }

    const { day, minutes } = manilaNow(now);
    const today = week.get(day) ?? [];
    const current = today.find(
        (hours) => minutes >= hours.open && minutes < hours.close,
    );

    if (current) {
        return { isOpen: true, detail: `until ${clockLabel(current.close)}` };
    }

    const laterToday = today
        .filter((hours) => hours.open > minutes)
        .sort((a, b) => a.open - b.open)[0];

    if (laterToday) {
        return {
            isOpen: false,
            detail: `opens at ${clockLabel(laterToday.open)}`,
        };
    }

    for (let offset = 1; offset <= 7; offset++) {
        const next = (day + offset) % 7;
        const first = [...(week.get(next) ?? [])].sort(
            (a, b) => a.open - b.open,
        )[0];

        if (first) {
            const when = offset === 1 ? 'tomorrow' : DAY_NAMES[next];

            return {
                isOpen: false,
                detail: `opens ${when} at ${clockLabel(first.open)}`,
            };
        }
    }

    return null;
}

/** "Mon–Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 5:00 PM" → one line per part. */
export function hoursLines(hours: string | null): string[] {
    return (hours ?? '')
        .split('·')
        .map((line) => line.trim())
        .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tracking copy (docs/public-site/04 §5.2)
// ---------------------------------------------------------------------------

/**
 * The friendly line under the order number on the tracker and tracking page.
 * `pickup` is a ready-made "Thursday, Oct 24, 1:00 – 3:00 PM"-style phrase.
 */
export function orderStatusMessage(
    status: OrderStatus,
    site: { name: string | null; phone: string | null; hours: string | null },
    pickup?: string | null,
): string {
    switch (status) {
        case 'pending':
            return pickup
                ? `Your pickup is booked. Our rider will collect your laundry on ${pickup}.`
                : 'Your pickup is booked. Our rider will collect your laundry soon.';
        case 'received':
            return 'We’ve got your laundry. It’s tagged, counted and in line for washing.';
        case 'washing':
            return 'Your laundry is in the washer.';
        case 'drying':
            return 'Your laundry is in the dryer.';
        case 'folding':
            return 'Almost done — we’re folding and packing your laundry.';
        case 'ready':
            return site.hours
                ? `Your laundry is ready! Pick it up any time during shop hours: ${site.hours}.`
                : 'Your laundry is ready! Pick it up any time during shop hours.';
        case 'out_for_delivery':
            return 'Our rider is on the way with your laundry.';
        case 'completed':
            return `Picked up — thank you for choosing ${site.name ?? 'us'}!`;
        case 'delivered':
            return `Delivered — thank you for choosing ${site.name ?? 'us'}!`;
        case 'cancelled':
            return site.phone
                ? `This order was cancelled. Questions? Call us at ${displayPhone(site.phone)}.`
                : 'This order was cancelled.';
    }
}
