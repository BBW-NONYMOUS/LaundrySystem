<?php

namespace App\Http\Resources;

use App\Models\BookingRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Staff inbox row. (Guests only ever see their reference number.)
 *
 * @mixin BookingRequest
 */
class BookingRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'pickup_date' => $this->pickup_date->toDateString(),
            'time_slot' => $this->time_slot->value,
            'time_slot_label' => $this->time_slot->label(),
            'time_window' => $this->time_slot->window(),
            'scheduled_at' => $this->scheduled_at->toIso8601String(),
            'service' => $this->whenLoaded('service', fn () => $this->service ? [
                'id' => $this->service->id,
                'name' => $this->service->name,
                'unit_short' => $this->service->pricing_unit->shortLabel(),
            ] : null),
            'estimated_quantity' => $this->estimated_quantity === null ? null : (float) $this->estimated_quantity,
            'is_express' => $this->is_express,
            'wants_delivery' => $this->wants_delivery,
            'special_instructions' => $this->special_instructions,
            // A returning customer (matched by mobile number) and how many orders they have.
            'customer' => $this->whenLoaded('customer', fn () => $this->customer ? [
                'id' => $this->customer->id,
                'name' => $this->customer->name,
                'orders_count' => $this->customer->orders_count ?? null,
            ] : null),
            'order' => $this->whenLoaded('order', fn () => $this->order ? [
                'id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'status' => $this->order->status->value,
            ] : null),
            'handled_by' => $this->whenLoaded('handler', fn () => $this->handler?->name),
            'handled_at' => $this->handled_at?->toIso8601String(),
            'decline_reason' => $this->decline_reason,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
