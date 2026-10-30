/**
 * Shapes returned by app/Services/ReportService.php (keep in sync).
 */

export type SalesTrendPoint = { date: string; sales: number; orders: number };

export type PeakHour = { hour: number; label: string; orders: number };

export type TopService = {
    service: string;
    revenue: number;
    quantity: number;
    orders: number;
};

export type TopCustomer = {
    customer_id: number;
    name: string;
    phone: string;
    orders: number;
    spent: number;
};

export type PaymentMethodTotal = {
    method: string;
    label: string;
    amount: number;
    count: number;
};

export type SalesRow = {
    date: string;
    orders: number;
    billed: number;
    express_fees: number;
    discounts: number;
    collected: number;
};

export type CompletedService = {
    service: string;
    unit: string;
    quantity: number;
    orders: number;
    revenue: number;
};

export type StaffActivityRow = {
    user_id: number;
    name: string;
    roles: string;
    orders_created: number;
    status_updates: number;
    payments_count: number;
    payments_amount: number;
    trips_completed: number;
    last_login_at: string | null;
};

export type DashboardStats = {
    sales_today: number;
    sales_yesterday: number;
    orders_today: number;
    orders_yesterday: number;
    in_process: number;
    ready: number;
    pending_pickups: number;
    out_for_delivery: number;
    overdue: number;
    unclaimed: number;
    low_stock: number;
    receivables: number;
};

export type DailySummary = {
    date: string;
    orders_received: number;
    orders_cancelled: number;
    express_orders: number;
    orders_released: number;
    billed: number;
    discounts: number;
    collected: number;
    cash_on_hand: number;
    voided_count: number;
    voided_amount: number;
    by_method: PaymentMethodTotal[];
    by_cashier: { name: string | null; count: number; amount: number }[];
};
