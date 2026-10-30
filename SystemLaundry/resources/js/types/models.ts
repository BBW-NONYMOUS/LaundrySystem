/**
 * Shapes of the props sent by app/Http/Resources/*. Keep in sync with the PHP resources.
 */

export type OrderStatus =
    | 'pending'
    | 'received'
    | 'washing'
    | 'drying'
    | 'folding'
    | 'ready'
    | 'out_for_delivery'
    | 'completed'
    | 'delivered'
    | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod =
    | 'cash'
    | 'gcash'
    | 'maya'
    | 'bank_transfer'
    | 'card';
export type PricingUnit = 'per_kg' | 'per_item';
export type DeliveryType = 'pickup' | 'delivery';
export type DeliveryStatus =
    | 'scheduled'
    | 'in_transit'
    | 'completed'
    | 'failed'
    | 'cancelled';
export type StockMovementType = 'in' | 'out' | 'adjustment';
export type UserRole = 'admin' | 'cashier' | 'staff' | 'rider' | 'customer';

export type Option<T extends string = string> = {
    value: T;
    label: string;
    color?: string;
};

export type PaymentMethodOption = Option<PaymentMethod> & {
    requires_reference: boolean;
};

export type UserSummary = {
    id: number;
    name: string;
    phone: string | null;
};

export type Customer = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    notes: string | null;
    has_portal_account: boolean;
    orders_count?: number;
    total_spent?: number;
    last_order_at?: string | null;
    created_at: string | null;
};

export type Service = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    pricing_unit: PricingUnit;
    pricing_unit_label: string;
    unit_short: string;
    price: number;
    min_quantity: number;
    turnaround_hours: number;
    express_turnaround_hours: number | null;
    offers_express: boolean;
    is_active: boolean;
    sort_order: number;
    order_items_count?: number;
};

export type OrderItem = {
    id: number;
    service_id: number;
    service_name: string;
    pricing_unit: PricingUnit;
    unit_short: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    piece_count: number | null;
    notes: string | null;
};

export type StatusHistory = {
    id: number;
    from_status: OrderStatus | null;
    to_status: OrderStatus;
    to_label: string;
    changed_by: string | null;
    notes: string | null;
    created_at: string;
};

export type Payment = {
    id: number;
    order_id: number;
    order_number?: string;
    customer_name?: string | null;
    method: PaymentMethod;
    method_label: string;
    reference_number: string | null;
    amount: number;
    amount_tendered: number | null;
    change: number;
    paid_at: string;
    received_by?: UserSummary | null;
    is_voided: boolean;
    voided_at: string | null;
    voided_by?: UserSummary | null;
    void_reason: string | null;
    notes: string | null;
};

export type Delivery = {
    id: number;
    order_id: number;
    order?: {
        id: number;
        order_number: string;
        status: OrderStatus;
        balance: number;
        customer_name: string | null;
        items_summary?: string | null;
    };
    type: DeliveryType;
    type_label: string;
    status: DeliveryStatus;
    status_label: string;
    status_color: string;
    rider?: UserSummary | null;
    scheduled_at: string;
    address: string;
    contact_phone: string;
    attempts: number;
    completed_at: string | null;
    failure_reason: string | null;
    notes: string | null;
};

export type NotificationLog = {
    id: number;
    channel: 'sms' | 'mail';
    type: string;
    recipient: string;
    message: string;
    status: 'queued' | 'sent' | 'failed';
    error: string | null;
    created_at: string | null;
};

export type Order = {
    id: number;
    order_number: string;
    tracking_code: string;
    status: OrderStatus;
    status_label: string;
    status_color: string;
    payment_status: PaymentStatus;
    payment_status_label: string;
    is_express: boolean;
    is_overdue: boolean;
    subtotal: number;
    express_fee: number;
    delivery_fee: number;
    discount_amount: number;
    discount_reason: string | null;
    total_amount: number;
    amount_paid: number;
    balance: number;
    special_instructions: string | null;
    received_at: string | null;
    due_at: string | null;
    ready_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    reminder_count: number;
    last_reminded_at: string | null;
    created_at: string | null;
    customer?: Customer;
    creator?: UserSummary | null;
    items_count?: number;
    items?: OrderItem[];
    status_histories?: StatusHistory[];
    payments?: Payment[];
    deliveries?: Delivery[];
    notification_logs?: NotificationLog[];
};

export type InventoryItem = {
    id: number;
    sku: string;
    name: string;
    unit: string;
    quantity_on_hand: number;
    reorder_level: number;
    unit_cost: number | null;
    stock_value: number | null;
    is_low_stock: boolean;
    is_active: boolean;
    updated_at: string | null;
};

export type StockMovement = {
    id: number;
    type: StockMovementType;
    type_label: string;
    quantity_change: number;
    balance_after: number;
    user?: UserSummary | null;
    order_number?: string | null;
    remarks: string | null;
    created_at: string;
};

export type StaffUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: UserRole | null;
    role_label: string | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string | null;
};

export type Activity = {
    id: number;
    log_name: string | null;
    description: string;
    event: string | null;
    subject_type: string | null;
    subject_id: number | null;
    subject_label: string | null;
    causer: string | null;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
    created_at: string | null;
};

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    url: string;
    level: 'warning' | 'destructive' | 'info';
    created_at: string | null;
};

/**
 * A Laravel paginated ResourceCollection.
 */
export type Paginated<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
};

/**
 * Filters echoed back by Controller::filters() so tables can show their state.
 */
export type TableFilters = {
    sort?: string | null;
    direction?: 'asc' | 'desc' | null;
    per_page?: number;
    [key: string]: string | number | null | undefined;
};
