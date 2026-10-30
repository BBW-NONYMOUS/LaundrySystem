import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

/**
 * Permission names from App\Enums\Permission. The server enforces every one of these;
 * the frontend only uses them to decide what to show.
 */
export type Permission =
    | 'dashboard.view'
    | 'dashboard.view-analytics'
    | 'customers.view'
    | 'customers.create'
    | 'customers.update'
    | 'customers.delete'
    | 'orders.view'
    | 'orders.create'
    | 'orders.update'
    | 'orders.cancel'
    | 'orders.update-status'
    | 'orders.override'
    | 'payments.view'
    | 'payments.create'
    | 'payments.void'
    | 'deliveries.view'
    | 'deliveries.assign'
    | 'deliveries.own'
    | 'services.manage'
    | 'inventory.view'
    | 'inventory.stock-out'
    | 'inventory.manage'
    | 'monitoring.view'
    | 'reports.daily-summary'
    | 'reports.view'
    | 'reports.export'
    | 'users.manage'
    | 'activity-log.view'
    | 'settings.manage'
    | 'portal.access'
    | 'bookings.manage'
    | 'messages.view'
    | 'website.manage';

export function usePermissions() {
    const permissions = usePage().props.auth.user?.permissions ?? [];

    /** True when the user has at least one of the given permissions. */
    const can = useCallback(
        (...required: Permission[]) =>
            required.some((permission) => permissions.includes(permission)),
        [permissions],
    );

    return { can, permissions };
}
