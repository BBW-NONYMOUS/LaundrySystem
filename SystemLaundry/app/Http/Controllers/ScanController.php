<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderStatusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ScanController extends Controller
{
    /**
     * Scanner page. USB/Bluetooth barcode scanners "type" the QR content and press Enter,
     * so ?code= accepts the full tag URL, an order number or a tracking code.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $code = trim($request->string('code')->toString());

        if ($code === '') {
            return Inertia::render('scan/index');
        }

        // The QR on the tag holds a URL like https://shop.test/scan/LND-20261023-0001.
        $code = strtoupper(basename(rtrim($code, '/')));

        $order = Order::query()
            ->where('order_number', $code)
            ->orWhere('tracking_code', $code)
            ->first();

        if ($order === null) {
            $this->toast("No order found for \"{$code}\".", 'error');

            return to_route('scan.index');
        }

        return to_route('scan.show', $order->order_number);
    }

    /**
     * Big "move to next status" buttons for staff at the washing area.
     */
    public function show(Request $request, string $orderNumber, OrderStatusService $statuses): Response
    {
        $order = Order::query()
            ->where('order_number', strtoupper($orderNumber))
            ->with(['customer:id,name,phone', 'items', 'statusHistories.changer:id,name'])
            ->firstOrFail();

        Gate::authorize('view', $order);

        $user = $request->user();

        return Inertia::render('scan/show', [
            'order' => OrderResource::make($order),
            'nextStatuses' => $user->can('updateStatus', $order)
                ? array_map(fn (OrderStatus $status) => [
                    'value' => $status->value,
                    'label' => $status->label(),
                    'color' => $status->color(),
                ], array_values(array_filter(
                    $statuses->availableTransitions($order, $user),
                    // Release and cancel happen at the counter, not at the machines.
                    fn (OrderStatus $status) => ! in_array($status, [OrderStatus::Cancelled, OrderStatus::Completed], true),
                )))
                : [],
        ]);
    }
}
