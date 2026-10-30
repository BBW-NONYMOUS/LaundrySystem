<?php

namespace App\Http\Resources;

use App\Models\Delivery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Delivery
 */
class DeliveryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'status' => $this->order->status->value,
                'balance' => $this->order->balance,
                'customer_name' => $this->order->relationLoaded('customer') ? $this->order->customer->name : null,
                // What's in the bag, for the rider's trip card (only when items were loaded).
                'items_summary' => $this->order->relationLoaded('items')
                    ? $this->order->items->map(fn ($item) => $item->service_name.' '.rtrim(rtrim(number_format((float) $item->quantity, 2), '0'), '.').$item->pricing_unit->shortLabel())->implode(', ')
                    : null,
            ]),
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_color' => $this->status->color(),
            'rider' => UserSummaryResource::make($this->whenLoaded('rider')),
            'scheduled_at' => $this->scheduled_at->toIso8601String(),
            'address' => $this->address,
            'contact_phone' => $this->contact_phone,
            'attempts' => $this->attempts,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'failure_reason' => $this->failure_reason,
            'notes' => $this->notes,
        ];
    }
}
