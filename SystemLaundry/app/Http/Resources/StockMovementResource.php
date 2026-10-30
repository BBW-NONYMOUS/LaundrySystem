<?php

namespace App\Http\Resources;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockMovement
 */
class StockMovementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'quantity_change' => (float) $this->quantity_change,
            'balance_after' => (float) $this->balance_after,
            'user' => UserSummaryResource::make($this->whenLoaded('user')),
            'order_number' => $this->whenLoaded('order', fn () => $this->order?->order_number),
            'remarks' => $this->remarks,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
