<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Cashier = 'cashier';
    case Staff = 'staff';
    case Rider = 'rider';
    case Customer = 'customer';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin / Owner',
            self::Cashier => 'Cashier',
            self::Staff => 'Laundry Staff',
            self::Rider => 'Delivery Rider',
            self::Customer => 'Customer',
        };
    }

    /**
     * Permissions granted to each role (matrix from docs/01-system-planning.md §3).
     *
     * @return list<Permission>
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Admin => Permission::cases(),
            self::Cashier => [
                Permission::DashboardView,
                Permission::CustomersView, Permission::CustomersCreate, Permission::CustomersUpdate,
                Permission::OrdersView, Permission::OrdersCreate, Permission::OrdersUpdate,
                Permission::OrdersCancel, Permission::OrdersUpdateStatus,
                Permission::PaymentsView, Permission::PaymentsCreate,
                Permission::DeliveriesView, Permission::DeliveriesAssign,
                Permission::InventoryView,
                Permission::MonitoringView,
                Permission::ReportsDailySummary,
                Permission::BookingsManage,
                Permission::MessagesView,
            ],
            self::Staff => [
                Permission::DashboardView,
                Permission::CustomersView,
                Permission::OrdersView, Permission::OrdersUpdateStatus,
                Permission::InventoryView, Permission::InventoryStockOut,
                Permission::MonitoringView,
            ],
            self::Rider => [
                Permission::DeliveriesOwn,
                Permission::PaymentsCreate,
            ],
            self::Customer => [
                Permission::PortalAccess,
            ],
        };
    }
}
