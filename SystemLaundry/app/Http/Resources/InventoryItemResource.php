<?php

namespace App\Http\Resources;

use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin InventoryItem
 */
class InventoryItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'name' => $this->name,
            'unit' => $this->unit,
            'quantity_on_hand' => (float) $this->quantity_on_hand,
            'reorder_level' => (float) $this->reorder_level,
            'unit_cost' => $this->unit_cost === null ? null : (float) $this->unit_cost,
            'stock_value' => $this->unit_cost === null ? null : round((float) $this->unit_cost * (float) $this->quantity_on_hand, 2),
            'is_low_stock' => $this->isLowStock(),
            'is_active' => $this->is_active,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
