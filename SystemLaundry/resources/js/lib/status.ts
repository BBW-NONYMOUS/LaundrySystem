import {
    CalendarClock,
    CircleCheck,
    CircleX,
    Inbox,
    PackageCheck,
    Shirt,
    Truck,
    WashingMachine,
    Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
    DeliveryStatus,
    OrderStatus,
    PaymentStatus,
} from '@/types/models';

/**
 * Status design tokens from docs/04-ui-ux-design.md §1.2.
 * Class names are spelled out in full so Tailwind can find them.
 */
export const orderStatusStyles: Record<
    OrderStatus,
    {
        label: string;
        icon: LucideIcon;
        badge: string;
        solid: string;
        dot: string;
    }
> = {
    pending: {
        label: 'For Pickup',
        icon: CalendarClock,
        badge: 'bg-status-pending/12 text-status-pending border-status-pending/25',
        solid: 'bg-status-pending text-white dark:text-neutral-950 hover:bg-status-pending/90',
        dot: 'bg-status-pending',
    },
    received: {
        label: 'Received',
        icon: Inbox,
        badge: 'bg-status-received/12 text-status-received border-status-received/25',
        solid: 'bg-status-received text-white dark:text-neutral-950 hover:bg-status-received/90',
        dot: 'bg-status-received',
    },
    washing: {
        label: 'Washing',
        icon: WashingMachine,
        badge: 'bg-status-washing/12 text-status-washing border-status-washing/25',
        solid: 'bg-status-washing text-white dark:text-neutral-950 hover:bg-status-washing/90',
        dot: 'bg-status-washing',
    },
    drying: {
        label: 'Drying',
        icon: Wind,
        badge: 'bg-status-drying/12 text-status-drying border-status-drying/25',
        solid: 'bg-status-drying text-white dark:text-neutral-950 hover:bg-status-drying/90',
        dot: 'bg-status-drying',
    },
    folding: {
        label: 'Folding',
        icon: Shirt,
        badge: 'bg-status-folding/12 text-status-folding border-status-folding/25',
        solid: 'bg-status-folding text-white dark:text-neutral-950 hover:bg-status-folding/90',
        dot: 'bg-status-folding',
    },
    ready: {
        label: 'Ready',
        icon: PackageCheck,
        badge: 'bg-status-ready/12 text-status-ready border-status-ready/25',
        solid: 'bg-status-ready text-white dark:text-neutral-950 hover:bg-status-ready/90',
        dot: 'bg-status-ready',
    },
    out_for_delivery: {
        label: 'Out for Delivery',
        icon: Truck,
        badge: 'bg-status-out-for-delivery/12 text-status-out-for-delivery border-status-out-for-delivery/25',
        solid: 'bg-status-out-for-delivery text-white dark:text-neutral-950 hover:bg-status-out-for-delivery/90',
        dot: 'bg-status-out-for-delivery',
    },
    completed: {
        label: 'Completed',
        icon: CircleCheck,
        badge: 'bg-status-completed/12 text-status-completed border-status-completed/25',
        solid: 'bg-status-completed text-white dark:text-neutral-950 hover:bg-status-completed/90',
        dot: 'bg-status-completed',
    },
    delivered: {
        label: 'Delivered',
        icon: CircleCheck,
        badge: 'bg-status-completed/12 text-status-completed border-status-completed/25',
        solid: 'bg-status-completed text-white dark:text-neutral-950 hover:bg-status-completed/90',
        dot: 'bg-status-completed',
    },
    cancelled: {
        label: 'Cancelled',
        icon: CircleX,
        badge: 'bg-status-cancelled/12 text-status-cancelled border-status-cancelled/25',
        solid: 'bg-status-cancelled text-white dark:text-neutral-950 hover:bg-status-cancelled/90',
        dot: 'bg-status-cancelled',
    },
};

/** The normal path an order travels, used by the stepper. */
export const orderProgressSteps: OrderStatus[] = [
    'received',
    'washing',
    'drying',
    'folding',
    'ready',
    'completed',
];

export const paymentStatusStyles: Record<
    PaymentStatus,
    { label: string; badge: string }
> = {
    unpaid: {
        label: 'Unpaid',
        badge: 'bg-destructive/10 text-destructive border-destructive/25',
    },
    partial: {
        label: 'Partial',
        badge: 'bg-warning/12 text-warning border-warning/25',
    },
    paid: {
        label: 'Paid',
        badge: 'bg-success/12 text-success border-success/25',
    },
};

export const deliveryStatusStyles: Record<DeliveryStatus, string> = {
    scheduled:
        'bg-status-pending/12 text-status-pending border-status-pending/25',
    in_transit:
        'bg-status-out-for-delivery/12 text-status-out-for-delivery border-status-out-for-delivery/25',
    completed: 'bg-success/12 text-success border-success/25',
    failed: 'bg-destructive/10 text-destructive border-destructive/25',
    cancelled: 'bg-muted text-muted-foreground',
};
