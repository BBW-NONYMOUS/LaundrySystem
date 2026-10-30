<?php

namespace App\Http\Controllers\Portal;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\StoreBookingRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ServiceResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Services\OrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Customer portal: my orders, order tracking, and pickup booking.
 */
class PortalController extends Controller
{
    public function index(Request $request): Response
    {
        $customer = $this->customer($request);

        return Inertia::render('portal/index', [
            'customer' => CustomerResource::make($customer),
            'activeOrders' => OrderResource::collection($customer->orders()->open()->withCount('items')->latest()->get()),
            'pastOrders' => OrderResource::collection(
                $customer->orders()->whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered, OrderStatus::Cancelled])
                    ->withCount('items')->latest()->paginate(10)->withQueryString(),
            ),
        ]);
    }

    public function show(Order $order): Response
    {
        Gate::authorize('view', $order);

        $order->load(['items', 'statusHistories', 'deliveries', 'payments' => fn ($payments) => $payments->whereNull('voided_at')]);

        return Inertia::render('portal/orders/show', [
            'order' => OrderResource::make($order),
        ]);
    }

    public function create(Request $request): Response
    {
        $customer = $this->customer($request);

        return Inertia::render('portal/bookings/create', [
            'customer' => CustomerResource::make($customer),
            'services' => ServiceResource::collection(Service::query()->active()->get()),
            'pricing' => [
                'express_surcharge_percent' => Setting::float('express_surcharge_percent'),
                'delivery_fee_per_trip' => Setting::float('default_delivery_fee'),
                'currency_symbol' => Setting::get('currency_symbol', '₱'),
            ],
        ]);
    }

    /**
     * Book a pickup. The order starts as Pending; the shop weighs and prices it on arrival.
     */
    public function store(StoreBookingRequest $request, OrderService $orders): RedirectResponse
    {
        $customer = $this->customer($request);

        $serviceNames = Service::query()->whereIn('id', $request->input('service_ids', []))->pluck('name');
        $notes = collect([
            $serviceNames->isNotEmpty() ? 'Requested: '.$serviceNames->implode(', ') : null,
            $request->boolean('wants_delivery') ? 'Customer wants the laundry delivered back.' : null,
            $request->input('special_instructions'),
        ])->filter()->implode("\n");

        $order = $orders->create([
            'customer_id' => $customer->id,
            'is_express' => $request->boolean('is_express'),
            'special_instructions' => $notes !== '' ? $notes : null,
            'pickup' => $request->safe()->only(['scheduled_at', 'address', 'contact_phone']),
        ], $request->user());

        $this->toast("Pickup booked! Your order number is {$order->order_number}.");

        return to_route('portal.orders.show', $order);
    }

    private function customer(Request $request): Customer
    {
        $customer = $request->user()->customer;

        abort_if($customer === null, 403, 'Your account is not linked to a customer profile.');

        return $customer;
    }
}
