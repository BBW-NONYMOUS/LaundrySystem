<?php

namespace App\Support;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Support\Str;

/**
 * The privacy-safe view of an order for people who aren't logged in (tracking page and
 * the Home quick tracker): first name only, no address, no staff names, no payments list.
 */
class PublicOrderSummary
{
    /**
     * @return array<string, mixed>
     */
    public static function make(Order $order): array
    {
        $order->loadMissing(['customer:id,name', 'items', 'statusHistories', 'delivery', 'pickup']);

        return [
            'order_number' => $order->order_number,
            'tracking_code' => $order->tracking_code,
            'customer_first_name' => Str::before($order->customer->name, ' '),
            'status' => $order->status->value,
            'status_label' => $order->status->label(),
            'status_color' => $order->status->color(),
            'is_express' => $order->is_express,
            'received_at' => $order->received_at?->toIso8601String(),
            'due_at' => $order->due_at?->toIso8601String(),
            'total_amount' => (float) $order->total_amount,
            'balance' => $order->balance,
            'items' => $order->items->map(fn ($item) => [
                'service_name' => $item->service_name,
                'quantity' => (float) $item->quantity,
                'unit' => $item->pricing_unit->shortLabel(),
            ])->all(),
            'timeline' => $order->statusHistories->map(fn (OrderStatusHistory $history) => [
                'status' => $history->to_status->value,
                'label' => $history->to_status->label(),
                'at' => $history->created_at->toIso8601String(),
            ])->all(),
            'pickup_scheduled_at' => $order->pickup?->scheduled_at->toIso8601String(),
            'delivery_scheduled_at' => $order->delivery?->scheduled_at->toIso8601String(),
        ];
    }
}
