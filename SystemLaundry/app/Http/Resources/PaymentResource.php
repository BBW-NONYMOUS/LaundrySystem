<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'order_number' => $this->whenLoaded('order', fn () => $this->order->order_number),
            'customer_name' => $this->whenLoaded('order', fn () => $this->order->relationLoaded('customer') ? $this->order->customer->name : null),
            'method' => $this->method->value,
            'method_label' => $this->method->label(),
            'reference_number' => $this->reference_number,
            'amount' => (float) $this->amount,
            'amount_tendered' => $this->amount_tendered === null ? null : (float) $this->amount_tendered,
            'change' => $this->change,
            'paid_at' => $this->paid_at->toIso8601String(),
            'received_by' => UserSummaryResource::make($this->whenLoaded('receiver')),
            'is_voided' => $this->isVoided(),
            'voided_at' => $this->voided_at?->toIso8601String(),
            'voided_by' => UserSummaryResource::make($this->whenLoaded('voider')),
            'void_reason' => $this->void_reason,
            'notes' => $this->notes,
        ];
    }
}
