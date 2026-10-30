<?php

namespace App\Http\Controllers;

use App\Http\Requests\Orders\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\RedirectResponse;

class OrderStatusController extends Controller
{
    /**
     * Used by the order page buttons, the status board and the QR scan page.
     */
    public function update(UpdateOrderStatusRequest $request, Order $order, OrderStatusService $statuses): RedirectResponse
    {
        $order = $statuses->transition($order, $request->status(), $request->user(), $request->input('notes'));

        $this->toast("{$order->order_number} is now {$order->status->label()}.");

        return back();
    }
}
