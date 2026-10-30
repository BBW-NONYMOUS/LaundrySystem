<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Http\Requests\Orders\StoreOrderRequest;
use App\Http\Requests\Orders\UpdateOrderRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ServiceResource;
use App\Http\Resources\UserSummaryResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use App\Services\OrderService;
use App\Services\OrderStatusService;
use App\Services\QrCodeService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Order::query()->with('customer')->withCount('items');

        $this->applyFilters($query, $request);
        $this->applySort($query, $request, [
            'order_number' => 'order_number',
            'created_at' => 'created_at',
            'due_at' => 'due_at',
            'total_amount' => 'total_amount',
            'status' => 'status',
        ], default: 'created_at');

        return Inertia::render('orders/index', [
            'orders' => OrderResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => $this->filters($request, ['search', 'status', 'payment_status', 'express', 'overdue', 'from', 'to']),
            'statusCounts' => Order::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'options' => [
                'statuses' => OrderStatus::options(),
                'paymentStatuses' => array_map(fn (PaymentStatus $status) => ['value' => $status->value, 'label' => $status->label(), 'color' => $status->color()], PaymentStatus::cases()),
            ],
        ]);
    }

    /**
     * Kanban-style board of laundry currently in the shop (polled every few seconds by the page).
     */
    public function board(): Response
    {
        $columns = [OrderStatus::Pending, OrderStatus::Received, OrderStatus::Washing, OrderStatus::Drying, OrderStatus::Folding, OrderStatus::Ready, OrderStatus::OutForDelivery];

        $orders = Order::query()
            ->whereIn('status', $columns)
            ->with('customer:id,name,phone')
            ->withCount('items')
            ->orderByRaw('due_at IS NULL, due_at')
            ->get()
            ->groupBy(fn (Order $order) => $order->status->value);

        return Inertia::render('orders/board', [
            'columns' => array_map(fn (OrderStatus $status) => [
                'status' => $status->value,
                'label' => $status->label(),
                'color' => $status->color(),
                'orders' => OrderResource::collection($orders->get($status->value, collect())),
            ], $columns),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('orders/create', [
            'services' => ServiceResource::collection(Service::query()->active()->get()),
            'riders' => UserSummaryResource::collection(User::withActiveRole(UserRole::Rider)->orderBy('name')->get()),
            'customer' => $request->filled('customer')
                ? CustomerResource::make(Customer::query()->findOrFail($request->integer('customer')))
                : null,
            'pricing' => [
                'express_surcharge_percent' => Setting::float('express_surcharge_percent'),
                'delivery_fee_per_trip' => Setting::float('default_delivery_fee'),
                'currency_symbol' => Setting::get('currency_symbol', '₱'),
            ],
            'paymentMethods' => array_map(fn (PaymentMethod $method) => [
                'value' => $method->value,
                'label' => $method->label(),
                'requires_reference' => $method->requiresReference(),
            ], PaymentMethod::cases()),
        ]);
    }

    public function store(StoreOrderRequest $request, OrderService $orders): RedirectResponse
    {
        $order = $orders->create($request->validated(), $request->user());

        $this->toast("Order {$order->order_number} saved.");

        return to_route('orders.show', $order);
    }

    public function show(Request $request, Order $order, OrderStatusService $statuses, QrCodeService $qr): Response
    {
        $user = $request->user();
        $order->load([
            'customer', 'creator', 'items',
            'statusHistories.changer:id,name',
            'payments' => fn ($payments) => $payments->with(['receiver:id,name', 'voider:id,name'])->latest('paid_at'),
            'deliveries.rider:id,name,phone',
            'notificationLogs' => fn ($logs) => $logs->latest(),
        ]);

        return Inertia::render('orders/show', [
            'order' => OrderResource::make($order),
            'nextStatuses' => array_map(fn (OrderStatus $status) => [
                'value' => $status->value,
                'label' => $status->label(),
                'color' => $status->color(),
            ], $statuses->availableTransitions($order, $user)),
            'qrSvg' => $qr->svg($qr->orderTagUrl($order), 160),
            'expressSurchargePercent' => Setting::float('express_surcharge_percent'),
            'can' => [
                'update' => $user->can('update', $order),
                'updateStatus' => $user->can('updateStatus', $order),
                'cancel' => $user->can('cancel', $order),
                'pay' => $user->can(Permission::PaymentsCreate->value) && $order->balance > 0 && $order->status !== OrderStatus::Cancelled,
                'voidPayments' => $user->can(Permission::PaymentsVoid->value),
                'scheduleTrips' => $user->can(Permission::DeliveriesAssign->value) && ! $order->status->isFinal(),
                'remind' => $user->can('remind', $order),
                'override' => $user->can(Permission::OrdersOverride->value),
            ],
            // Lazily loaded only when the Edit sheet / Schedule dialog opens (router.reload({ only: [...] })).
            'services' => Inertia::optional(fn () => ServiceResource::collection(Service::query()->active()->get())),
            'riders' => Inertia::optional(fn () => UserSummaryResource::collection(User::withActiveRole(UserRole::Rider)->orderBy('name')->get())),
            'paymentMethods' => array_map(fn (PaymentMethod $method) => [
                'value' => $method->value,
                'label' => $method->label(),
                'requires_reference' => $method->requiresReference(),
            ], PaymentMethod::cases()),
        ]);
    }

    public function update(UpdateOrderRequest $request, Order $order, OrderService $orders): RedirectResponse
    {
        $orders->update($order, $request->validated());

        $this->toast("Order {$order->order_number} updated.");

        return back();
    }

    /**
     * @param  Builder<Order>  $query
     */
    private function applyFilters(Builder $query, Request $request): void
    {
        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                $query->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn (Builder $customers) => $customers->search($search));
            });
        }

        $statuses = array_filter(explode(',', $request->string('status')->toString()), fn ($status) => OrderStatus::tryFrom($status) !== null);

        if ($statuses !== []) {
            $query->whereIn('status', $statuses);
        }

        if (PaymentStatus::tryFrom($request->string('payment_status')->toString()) !== null) {
            $query->where('payment_status', $request->string('payment_status')->toString());
        }

        if ($request->boolean('express')) {
            $query->where('is_express', true);
        }

        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from')?->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')?->endOfDay());
        }
    }
}
