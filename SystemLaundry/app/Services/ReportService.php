<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\Delivery;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

/**
 * All dashboard, report and export numbers come from here so the screen, the PDF and the
 * Excel file always agree.
 *
 * Definitions:
 *  - "Collected" = valid (non-voided) payments by paid_at (cash basis).
 *  - "Billed"    = total_amount of non-cancelled orders by created_at.
 */
class ReportService
{
    /**
     * Normalize a from/to filter into whole days (defaults to the last $days days).
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function range(?string $from, ?string $to, int $days = 30): array
    {
        $end = $to ? CarbonImmutable::parse($to)->endOfDay() : CarbonImmutable::now()->endOfDay();
        $start = $from ? CarbonImmutable::parse($from)->startOfDay() : $end->subDays($days - 1)->startOfDay();

        return $start->greaterThan($end) ? [$end->startOfDay(), $start->endOfDay()] : [$start, $end];
    }

    /**
     * KPI cards for the dashboards.
     *
     * @return array<string, float|int>
     */
    public function dashboardStats(): array
    {
        $today = CarbonImmutable::today();
        $yesterday = $today->subDay();

        return [
            'sales_today' => $this->collected($today, $today->endOfDay()),
            'sales_yesterday' => $this->collected($yesterday, $yesterday->endOfDay()),
            'orders_today' => Order::billable()->whereBetween('created_at', [$today, $today->endOfDay()])->count(),
            'orders_yesterday' => Order::billable()->whereBetween('created_at', [$yesterday, $yesterday->endOfDay()])->count(),
            'in_process' => Order::whereIn('status', OrderStatus::inProcess())->count(),
            'ready' => Order::where('status', OrderStatus::Ready)->count(),
            'pending_pickups' => Order::where('status', OrderStatus::Pending)->count(),
            'out_for_delivery' => Order::where('status', OrderStatus::OutForDelivery)->count(),
            'overdue' => Order::overdue()->count(),
            'unclaimed' => Order::unclaimed(Setting::int('unclaimed_after_days'))->count(),
            'low_stock' => InventoryItem::lowStock()->count(),
            'receivables' => round((float) Order::open()->sum(DB::raw('total_amount - amount_paid')), 2),
        ];
    }

    public function collected(CarbonInterface $from, CarbonInterface $to): float
    {
        return round((float) Payment::valid()->whereBetween('paid_at', [$from, $to])->sum('amount'), 2);
    }

    /**
     * Daily collected sales and order counts, with zero-filled gaps for the chart.
     *
     * @return list<array{date: string, sales: float, orders: int}>
     */
    public function salesTrend(CarbonInterface $from, CarbonInterface $to): array
    {
        $sales = Payment::valid()
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as day, SUM(amount) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $orders = Order::billable()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $rows = [];

        foreach (CarbonPeriod::create($from->toDateString(), $to->toDateString()) as $day) {
            $key = $day->toDateString();
            $rows[] = [
                'date' => $key,
                'sales' => round((float) ($sales[$key] ?? 0), 2),
                'orders' => (int) ($orders[$key] ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * Orders received per hour of the day (shop hours 7 AM - 8 PM) — shows the peak hours.
     *
     * @return list<array{hour: int, label: string, orders: int}>
     */
    public function peakHours(CarbonInterface $from, CarbonInterface $to): array
    {
        $counts = Order::billable()
            ->whereNotNull('received_at')
            ->whereBetween('received_at', [$from, $to])
            ->selectRaw($this->receivedHourSelect())
            ->groupBy('hour')
            ->pluck('total', 'hour');

        $rows = [];

        for ($hour = 7; $hour <= 20; $hour++) {
            $rows[] = [
                'hour' => $hour,
                'label' => CarbonImmutable::today()->setTime($hour, 0)->format('g A'),
                'orders' => (int) ($counts[$hour] ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array{service: string, revenue: float, quantity: float, orders: int}>
     */
    public function topServices(CarbonInterface $from, CarbonInterface $to, int $limit = 5): array
    {
        return array_values(OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('order_items.service_name as service, SUM(order_items.line_total) as revenue, SUM(order_items.quantity) as quantity, COUNT(DISTINCT order_items.order_id) as orders')
            ->groupBy('order_items.service_name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->toBase()
            ->get()
            ->map(fn (object $row) => [
                'service' => (string) $row->service,
                'revenue' => round((float) $row->revenue, 2),
                'quantity' => round((float) $row->quantity, 2),
                'orders' => (int) $row->orders,
            ])
            ->all());
    }

    /**
     * @return list<array{customer_id: int, name: string, phone: string, orders: int, spent: float}>
     */
    public function topCustomers(CarbonInterface $from, CarbonInterface $to, int $limit = 5): array
    {
        return array_values(Order::query()
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->where('orders.status', '!=', OrderStatus::Cancelled->value)
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('customers.id as customer_id, customers.name as name, customers.phone as phone, COUNT(*) as orders, SUM(orders.total_amount) as spent')
            ->groupBy('customers.id', 'customers.name', 'customers.phone')
            ->orderByDesc('spent')
            ->limit($limit)
            ->toBase()
            ->get()
            ->map(fn (object $row) => [
                'customer_id' => (int) $row->customer_id,
                'name' => (string) $row->name,
                'phone' => (string) $row->phone,
                'orders' => (int) $row->orders,
                'spent' => round((float) $row->spent, 2),
            ])
            ->all());
    }

    /**
     * @return list<array{method: string, label: string, amount: float, count: int}>
     */
    public function paymentMethods(CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = Payment::valid()
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('method, SUM(amount) as amount, COUNT(*) as count')
            ->groupBy('method')
            ->toBase()
            ->get()
            ->keyBy('method');

        return array_map(fn (PaymentMethod $method) => [
            'method' => $method->value,
            'label' => $method->label(),
            'amount' => round((float) ($rows[$method->value]->amount ?? 0), 2),
            'count' => (int) ($rows[$method->value]->count ?? 0),
        ], PaymentMethod::cases());
    }

    /**
     * End-of-day closing summary (feature: daily transaction summaries).
     *
     * @return array<string, mixed>
     */
    public function dailySummary(CarbonInterface $date): array
    {
        $from = CarbonImmutable::parse($date)->startOfDay();
        $to = $from->endOfDay();

        $ordersToday = Order::query()->whereBetween('created_at', [$from, $to]);
        $payments = Payment::query()->with('receiver:id,name')->whereBetween('paid_at', [$from, $to])->get();
        $valid = $payments->whereNull('voided_at');

        return [
            'date' => $from->toDateString(),
            'orders_received' => (clone $ordersToday)->where('status', '!=', OrderStatus::Cancelled->value)->count(),
            'orders_cancelled' => (clone $ordersToday)->where('status', OrderStatus::Cancelled->value)->count(),
            'express_orders' => (clone $ordersToday)->where('is_express', true)->count(),
            'orders_released' => Order::whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered])->whereBetween('completed_at', [$from, $to])->count(),
            'billed' => round((float) (clone $ordersToday)->where('status', '!=', OrderStatus::Cancelled->value)->sum('total_amount'), 2),
            'discounts' => round((float) (clone $ordersToday)->sum('discount_amount'), 2),
            'collected' => round((float) $valid->sum('amount'), 2),
            'cash_on_hand' => round((float) $valid->where('method', PaymentMethod::Cash)->sum('amount'), 2),
            'voided_count' => $payments->whereNotNull('voided_at')->count(),
            'voided_amount' => round((float) $payments->whereNotNull('voided_at')->sum('amount'), 2),
            'by_method' => $this->paymentMethods($from, $to),
            'by_cashier' => $valid->groupBy('received_by')->map(fn ($group) => [
                'name' => $group->first()?->receiver->name,
                'count' => $group->count(),
                'amount' => round((float) $group->sum('amount'), 2),
            ])->values()->all(),
        ];
    }

    /**
     * One row per day for the sales report.
     *
     * @return list<array{date: string, orders: int, billed: float, express_fees: float, discounts: float, collected: float}>
     */
    public function salesReport(CarbonInterface $from, CarbonInterface $to): array
    {
        $orders = Order::billable()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as orders, SUM(total_amount) as billed, SUM(express_fee) as express_fees, SUM(discount_amount) as discounts')
            ->groupBy('day')
            ->toBase()
            ->get()
            ->keyBy('day');

        $collected = Payment::valid()
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as day, SUM(amount) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $rows = [];

        foreach (CarbonPeriod::create($from->toDateString(), $to->toDateString()) as $day) {
            $key = $day->toDateString();
            $row = $orders[$key] ?? null;
            $rows[] = [
                'date' => $key,
                'orders' => (int) ($row->orders ?? 0),
                'billed' => round((float) ($row->billed ?? 0), 2),
                'express_fees' => round((float) ($row->express_fees ?? 0), 2),
                'discounts' => round((float) ($row->discounts ?? 0), 2),
                'collected' => round((float) ($collected[$key] ?? 0), 2),
            ];
        }

        return $rows;
    }

    /**
     * Services delivered on orders released (completed/delivered) in the period.
     *
     * @return list<array{service: string, unit: string, quantity: float, orders: int, revenue: float}>
     */
    public function completedServices(CarbonInterface $from, CarbonInterface $to): array
    {
        return array_values(OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', [OrderStatus::Completed->value, OrderStatus::Delivered->value])
            ->whereBetween('orders.completed_at', [$from, $to])
            ->selectRaw('order_items.service_name as service, order_items.pricing_unit as unit, SUM(order_items.quantity) as quantity, COUNT(DISTINCT order_items.order_id) as orders, SUM(order_items.line_total) as revenue')
            ->groupBy('order_items.service_name', 'order_items.pricing_unit')
            ->orderByDesc('revenue')
            ->toBase()
            ->get()
            ->map(fn (object $row) => [
                'service' => (string) $row->service,
                'unit' => (string) $row->unit,
                'quantity' => round((float) $row->quantity, 2),
                'orders' => (int) $row->orders,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->all());
    }

    /**
     * What each staff member did in the period.
     *
     * @return list<array{user_id: int, name: string, roles: string, orders_created: int, status_updates: int, payments_count: int, payments_amount: float, trips_completed: int, last_login_at: string|null}>
     */
    public function staffActivity(CarbonInterface $from, CarbonInterface $to): array
    {
        $staff = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', UserRole::Customer->value))
            ->with('roles:id,name')
            ->orderBy('name')
            ->get();

        $ordersCreated = Order::whereBetween('created_at', [$from, $to])->selectRaw('created_by, COUNT(*) as total')->groupBy('created_by')->pluck('total', 'created_by');
        $statusUpdates = OrderStatusHistory::whereBetween('created_at', [$from, $to])->selectRaw('changed_by, COUNT(*) as total')->groupBy('changed_by')->pluck('total', 'changed_by');
        $payments = Payment::valid()->whereBetween('paid_at', [$from, $to])->selectRaw('received_by, COUNT(*) as count, SUM(amount) as amount')->groupBy('received_by')->toBase()->get()->keyBy('received_by');
        $trips = Delivery::whereNotNull('completed_at')->whereBetween('completed_at', [$from, $to])->selectRaw('rider_id, COUNT(*) as total')->groupBy('rider_id')->pluck('total', 'rider_id');

        return array_values($staff->map(fn (User $user) => [
            'user_id' => $user->id,
            'name' => $user->name,
            'roles' => $user->roles->pluck('name')->map(fn (string $role) => UserRole::tryFrom($role)?->label() ?? $role)->implode(', '),
            'orders_created' => (int) ($ordersCreated[$user->id] ?? 0),
            'status_updates' => (int) ($statusUpdates[$user->id] ?? 0),
            'payments_count' => (int) ($payments[$user->id]->count ?? 0),
            'payments_amount' => round((float) ($payments[$user->id]->amount ?? 0), 2),
            'trips_completed' => (int) ($trips[$user->id] ?? 0),
            'last_login_at' => $user->last_login_at?->toDateTimeString(),
        ])->all());
    }

    /**
     * "Hour of day" differs per database: MariaDB/MySQL in production, SQLite in tests.
     *
     * @return literal-string
     */
    private function receivedHourSelect(): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "CAST(strftime('%H', received_at) AS INTEGER) as hour, COUNT(*) as total"
            : 'HOUR(received_at) as hour, COUNT(*) as total';
    }
}
