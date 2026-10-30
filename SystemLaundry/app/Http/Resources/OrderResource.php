<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Used for both list rows and the order details page; relations appear only when loaded.
 *
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'tracking_code' => $this->tracking_code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'payment_status' => $this->payment_status->value,
            'payment_status_label' => $this->payment_status->label(),
            'is_express' => $this->is_express,
            'is_overdue' => $this->isOverdue(),
            'subtotal' => (float) $this->subtotal,
            'express_fee' => (float) $this->express_fee,
            'delivery_fee' => (float) $this->delivery_fee,
            'discount_amount' => (float) $this->discount_amount,
            'discount_reason' => $this->discount_reason,
            'total_amount' => (float) $this->total_amount,
            'amount_paid' => (float) $this->amount_paid,
            'balance' => $this->balance,
            'special_instructions' => $this->special_instructions,
            'received_at' => $this->received_at?->toIso8601String(),
            'due_at' => $this->due_at?->toIso8601String(),
            'ready_at' => $this->ready_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $this->cancellation_reason,
            'reminder_count' => $this->reminder_count,
            'last_reminded_at' => $this->last_reminded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer' => CustomerResource::make($this->whenLoaded('customer')),
            'creator' => UserSummaryResource::make($this->whenLoaded('creator')),
            'items_count' => $this->whenCounted('items'),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'service_id' => $item->service_id,
                'service_name' => $item->service_name,
                'pricing_unit' => $item->pricing_unit->value,
                'unit_short' => $item->pricing_unit->shortLabel(),
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
                'piece_count' => $item->piece_count,
                'notes' => $item->notes,
            ])->all()),
            'status_histories' => $this->whenLoaded('statusHistories', fn () => $this->statusHistories->map(fn (OrderStatusHistory $history) => [
                'id' => $history->id,
                'from_status' => $history->from_status?->value,
                'to_status' => $history->to_status->value,
                'to_label' => $history->to_status->label(),
                // Only staff pages eager-load the changer; the customer portal never receives staff names.
                'changed_by' => $history->relationLoaded('changer') ? $history->changer?->name : null,
                'notes' => $history->notes,
                'created_at' => $history->created_at->toIso8601String(),
            ])->all()),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'deliveries' => DeliveryResource::collection($this->whenLoaded('deliveries')),
            'notification_logs' => $this->whenLoaded('notificationLogs', fn () => $this->notificationLogs->map(fn ($log) => [
                'id' => $log->id,
                'channel' => $log->channel->value,
                'type' => $log->type,
                'recipient' => $log->recipient,
                'message' => $log->message,
                'status' => $log->status->value,
                'error' => $log->error,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->all()),
        ];
    }
}
