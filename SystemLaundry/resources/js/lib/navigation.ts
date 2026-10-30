import type { InertiaLinkProps } from '@inertiajs/react';
import {
    AlarmClock,
    BarChart3,
    CalendarCheck,
    CalendarDays,
    CircleHelp,
    ClipboardList,
    FileText,
    Globe,
    History,
    KanbanSquare,
    LayoutGrid,
    Mail,
    PackageOpen,
    Plus,
    ScanLine,
    Settings,
    Shirt,
    Star,
    Tags,
    Truck,
    Users,
    UsersRound,
    Wallet,
    Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/hooks/use-permissions';
import { index as activityLog } from '@/routes/activity-log';
import { dashboard, home } from '@/routes';
import { index as bookingRequests } from '@/routes/booking-requests';
import { index as contactMessages } from '@/routes/contact-messages';
import { index as customers } from '@/routes/customers';
import { index as deliveries } from '@/routes/deliveries';
import { index as faqs } from '@/routes/faqs';
import { index as inventory } from '@/routes/inventory';
import { overdue, unclaimed } from '@/routes/monitoring';
import { board, create as newOrder, index as orders } from '@/routes/orders';
import { index as payments } from '@/routes/payments';
import { index as portal } from '@/routes/portal';
import { create as bookPickup } from '@/routes/portal/bookings';
import {
    daily,
    index as reports,
    staff as staffReport,
} from '@/routes/reports';
import { index as myTrips } from '@/routes/rider/deliveries';
import { index as scan } from '@/routes/scan';
import { index as services } from '@/routes/services';
import { edit as shopSettings } from '@/routes/shop';
import { index as testimonials } from '@/routes/testimonials';
import { index as users } from '@/routes/users';

export type NavCountKey =
    | 'overdue'
    | 'unclaimed'
    | 'low_stock'
    | 'bookings_pending'
    | 'messages_new'
    | 'reviews_pending';

export type NavLink = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon: LucideIcon;
    /** Shown when the user has ANY of these permissions. */
    can: Permission[];
    /** Key into the shared `navCounts` prop for a sidebar badge. */
    badge?: NavCountKey;
    /** Opens in a new browser tab (the public website). */
    newTab?: boolean;
    /** Shortcut hint shown in the command palette. */
    shortcut?: string;
    /** Extra words the command palette should match. */
    keywords?: string[];
};

export type NavGroup = { label: string; items: NavLink[] };

/**
 * Sidebar + command palette menu (docs/04-ui-ux-design.md §2.1).
 * Items the user can't access are hidden; empty groups disappear.
 */
export const navGroups: NavGroup[] = [
    {
        label: 'Operations',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
                can: ['dashboard.view'],
            },
            {
                title: 'Orders',
                href: orders(),
                icon: ClipboardList,
                can: ['orders.view'],
                keywords: ['laundry', 'list'],
            },
            {
                title: 'Status board',
                href: board(),
                icon: KanbanSquare,
                can: ['orders.view'],
                keywords: ['kanban', 'washing', 'process'],
            },
            {
                title: 'Scan',
                href: scan(),
                icon: ScanLine,
                can: ['orders.update-status'],
                shortcut: 'Alt+S',
                keywords: ['qr', 'tag', 'barcode'],
            },
        ],
    },
    {
        label: 'Customers & money',
        items: [
            {
                title: 'Customers',
                href: customers(),
                icon: UsersRound,
                can: ['customers.view'],
            },
            {
                title: 'Payments',
                href: payments(),
                icon: Wallet,
                can: ['payments.view'],
                keywords: ['cash', 'gcash', 'history'],
            },
            {
                title: 'Deliveries',
                href: deliveries(),
                icon: Truck,
                can: ['deliveries.view'],
                keywords: ['pickup', 'rider', 'schedule'],
            },
        ],
    },
    {
        label: 'Monitoring',
        items: [
            {
                title: 'Overdue',
                href: overdue(),
                icon: AlarmClock,
                can: ['monitoring.view'],
                badge: 'overdue',
                keywords: ['late'],
            },
            {
                title: 'Unclaimed',
                href: unclaimed(),
                icon: PackageOpen,
                can: ['monitoring.view'],
                badge: 'unclaimed',
                keywords: ['reminder'],
            },
        ],
    },
    {
        label: 'Website',
        items: [
            {
                title: 'Booking requests',
                href: bookingRequests(),
                icon: CalendarCheck,
                can: ['bookings.manage'],
                badge: 'bookings_pending',
                keywords: ['pickup', 'guest', 'online', 'confirm'],
            },
            {
                title: 'Messages',
                href: contactMessages(),
                icon: Mail,
                can: ['messages.view'],
                badge: 'messages_new',
                keywords: ['contact', 'inquiry', 'inbox'],
            },
            {
                title: 'FAQs',
                href: faqs(),
                icon: CircleHelp,
                can: ['website.manage'],
                keywords: ['questions', 'website'],
            },
            {
                title: 'Reviews',
                href: testimonials(),
                icon: Star,
                can: ['website.manage'],
                badge: 'reviews_pending',
                keywords: ['testimonials', 'feedback', 'rating'],
            },
            {
                title: 'View website',
                href: home(),
                icon: Globe,
                can: ['bookings.manage', 'messages.view', 'website.manage'],
                newTab: true,
                keywords: ['public', 'landing', 'home page'],
            },
        ],
    },
    {
        label: 'Management',
        items: [
            {
                title: 'Services & pricing',
                href: services(),
                icon: Tags,
                can: ['services.manage'],
                keywords: ['price'],
            },
            {
                title: 'Inventory',
                href: inventory(),
                icon: Warehouse,
                can: ['inventory.view'],
                badge: 'low_stock',
                keywords: ['supplies', 'stock', 'detergent'],
            },
            {
                title: 'Reports',
                href: reports(),
                icon: BarChart3,
                can: ['reports.view'],
                keywords: ['sales', 'analytics', 'export'],
            },
            {
                title: 'Daily summary',
                href: daily(),
                icon: FileText,
                can: ['reports.daily-summary', 'reports.view'],
                keywords: ['closing', 'z-reading'],
            },
            {
                title: 'Staff activity',
                href: staffReport(),
                icon: Users,
                can: ['reports.view'],
            },
            {
                title: 'Users',
                href: users(),
                icon: Users,
                can: ['users.manage'],
                keywords: ['staff', 'accounts', 'roles'],
            },
            {
                title: 'Activity log',
                href: activityLog(),
                icon: History,
                can: ['activity-log.view'],
                keywords: ['audit'],
            },
            {
                title: 'Shop settings',
                href: shopSettings(),
                icon: Settings,
                can: ['settings.manage'],
                keywords: ['express', 'sms', 'receipt'],
            },
        ],
    },
    {
        label: 'Rider',
        items: [
            {
                title: 'My trips',
                href: myTrips(),
                icon: Truck,
                can: ['deliveries.own'],
            },
        ],
    },
    {
        label: 'My laundry',
        items: [
            {
                title: 'My orders',
                href: portal(),
                icon: Shirt,
                can: ['portal.access'],
            },
            {
                title: 'Book a pickup',
                href: bookPickup(),
                icon: CalendarDays,
                can: ['portal.access'],
            },
        ],
    },
];

export const newOrderLink: NavLink = {
    title: 'New order',
    href: newOrder(),
    icon: Plus,
    can: ['orders.create'],
    shortcut: 'Alt+N',
};
