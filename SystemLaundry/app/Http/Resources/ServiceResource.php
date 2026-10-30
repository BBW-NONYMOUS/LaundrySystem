<?php

namespace App\Http\Resources;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Service
 */
class ServiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'pricing_unit' => $this->pricing_unit->value,
            'pricing_unit_label' => $this->pricing_unit->label(),
            'unit_short' => $this->pricing_unit->shortLabel(),
            'price' => (float) $this->price,
            'min_quantity' => (float) $this->min_quantity,
            'turnaround_hours' => $this->turnaround_hours,
            'express_turnaround_hours' => $this->express_turnaround_hours,
            'offers_express' => $this->offersExpress(),
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            'order_items_count' => $this->whenCounted('orderItems'),
        ];
    }
}
