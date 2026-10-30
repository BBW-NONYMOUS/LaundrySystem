<?php

namespace App\Enums;

/**
 * Every permission name used by policies, middleware, and the sidebar.
 * Keeping them in one enum prevents typos like "order.create" vs "orders.create".
 */
enum Permission: string
{
    case DashboardView = 'dashboard.view';
    case DashboardAnalytics = 'dashboard.view-analytics';

    case CustomersView = 'customers.view';
    case CustomersCreate = 'customers.create';
    case CustomersUpdate = 'customers.update';
    case CustomersDelete = 'customers.delete';

    case OrdersView = 'orders.view';
    case OrdersCreate = 'orders.create';
    case OrdersUpdate = 'orders.update';
    case OrdersCancel = 'orders.cancel';
    case OrdersUpdateStatus = 'orders.update-status';
    case OrdersOverride = 'orders.override';

    case PaymentsView = 'payments.view';
    case PaymentsCreate = 'payments.create';
    case PaymentsVoid = 'payments.void';

    case DeliveriesView = 'deliveries.view';
    case DeliveriesAssign = 'deliveries.assign';
    case DeliveriesOwn = 'deliveries.own';

    case ServicesManage = 'services.manage';

    case InventoryView = 'inventory.view';
    case InventoryStockOut = 'inventory.stock-out';
    case InventoryManage = 'inventory.manage';

    case MonitoringView = 'monitoring.view';

    case ReportsDailySummary = 'reports.daily-summary';
    case ReportsView = 'reports.view';
    case ReportsExport = 'reports.export';

    case UsersManage = 'users.manage';
    case ActivityLogView = 'activity-log.view';
    case SettingsManage = 'settings.manage';

    case PortalAccess = 'portal.access';

    // Public website inboxes and content (docs/public-site/03-backend.md).
    case BookingsManage = 'bookings.manage';
    case MessagesView = 'messages.view';
    case WebsiteManage = 'website.manage';
}
