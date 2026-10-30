<?php

namespace App\Http\Resources;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'notes' => $this->notes,
            'has_portal_account' => $this->user_id !== null,
            'orders_count' => $this->whenCounted('orders'),
            // Present only when the query used withSum()/withMax() (customers list).
            'total_spent' => $this->when(
                array_key_exists('orders_sum_total_amount', $this->resource->getAttributes()),
                fn () => round((float) $this->resource->getAttribute('orders_sum_total_amount'), 2),
            ),
            'last_order_at' => $this->when(
                array_key_exists('orders_max_created_at', $this->resource->getAttributes()),
                fn () => $this->resource->getAttribute('orders_max_created_at'),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
