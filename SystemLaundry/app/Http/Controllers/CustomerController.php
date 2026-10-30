<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\Customers\SaveCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentResource;
use App\Models\Customer;
use App\Models\Payment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Customer::query()
            ->search($request->string('search')->toString())
            ->withCount('orders')
            ->withSum(['orders' => fn ($orders) => $orders->where('status', '!=', OrderStatus::Cancelled)], 'total_amount')
            ->withMax('orders', 'created_at');

        $this->applySort($query, $request, [
            'name' => 'name',
            'created_at' => 'created_at',
            'orders_count' => 'orders_count',
            'total_spent' => 'orders_sum_total_amount',
            'last_order_at' => 'orders_max_created_at',
        ], default: 'name', defaultDirection: 'asc');

        return Inertia::render('customers/index', [
            'customers' => CustomerResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => $this->filters($request, ['search']),
        ]);
    }

    public function store(SaveCustomerRequest $request): RedirectResponse
    {
        $customer = Customer::query()->create($request->validated());

        $this->toast("{$customer->name} added.");

        return back();
    }

    public function show(Customer $customer, Request $request): Response
    {
        $orders = $customer->orders()->withCount('items')->latest()->paginate(10)->withQueryString();
        $payments = Payment::query()
            ->whereIn('order_id', $customer->orders()->select('id'))
            ->with(['order:id,order_number', 'receiver:id,name'])
            ->latest('paid_at')
            ->limit(20)
            ->get();

        return Inertia::render('customers/show', [
            'customer' => CustomerResource::make($customer),
            'orders' => OrderResource::collection($orders),
            'payments' => PaymentResource::collection($payments),
            'summary' => [
                'orders' => $customer->orders()->count(),
                'spent' => round((float) $customer->orders()->billable()->sum('total_amount'), 2),
                'balance' => round((float) $customer->orders()->open()->sum(DB::raw('total_amount - amount_paid')), 2),
                'open_orders' => $customer->orders()->open()->count(),
            ],
            'can' => [
                'update' => $request->user()->can('update', $customer),
                'delete' => $request->user()->can('delete', $customer),
            ],
        ]);
    }

    public function update(SaveCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        $this->toast('Customer details saved.');

        return back();
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        $this->toast("{$customer->name} was removed. Their past orders are kept.");

        return to_route('customers.index');
    }
}
