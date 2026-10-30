<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Typeahead JSON for the Ctrl+K command palette and the customer combobox.
 * This is the one non-page endpoint: results change on every keystroke, so a full
 * Inertia visit per keypress would be wasteful.
 */
class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim($request->string('q')->toString());
        $user = $request->user();

        if (mb_strlen($term) < 2) {
            return response()->json(['customers' => [], 'orders' => []]);
        }

        $customers = $user->can(Permission::CustomersView->value)
            ? Customer::query()->search($term)->orderBy('name')->limit(8)
                ->get(['id', 'name', 'phone', 'email', 'address'])
            : [];

        $orders = $user->can(Permission::OrdersView->value)
            ? Order::query()
                ->with('customer:id,name')
                ->where(fn (Builder $query) => $query
                    ->where('order_number', 'like', "%{$term}%")
                    ->orWhere('tracking_code', strtoupper($term))
                    ->orWhereHas('customer', fn (Builder $customers) => $customers->search($term)))
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (Order $order) => [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer_name' => $order->customer->name,
                    'status' => $order->status->value,
                    'status_label' => $order->status->label(),
                    'status_color' => $order->status->color(),
                ])
            : [];

        return response()->json(['customers' => $customers, 'orders' => $orders]);
    }
}
