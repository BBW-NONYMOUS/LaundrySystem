import type { Auth } from '@/types/auth';
import type { AppNotification, Option, OrderStatus } from '@/types/models';
import type {
    BookingConfirmation,
    PublicOrder,
    SiteSettings,
} from '@/types/public';
import type { FlashToast } from '@/types/ui';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        flashDataType: {
            toast?: FlashToast;
            /** Home quick tracker result (TrackOrderController, inline lookup). */
            trackedOrder?: PublicOrder;
            /** Guest booking saved (public BookingRequestController). */
            booking?: BookingConfirmation;
        };
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            shop: { name: string | null; currency_symbol: string | null };
            site: SiteSettings;
            orderStatuses: Option<OrderStatus>[];
            notifications: {
                unread_count: number;
                latest: AppNotification[];
            } | null;
            navCounts: {
                overdue: number;
                unclaimed: number;
                low_stock: number;
                bookings_pending: number;
                messages_new: number;
                reviews_pending: number;
            } | null;
            [key: string]: unknown;
        };
    }
}
