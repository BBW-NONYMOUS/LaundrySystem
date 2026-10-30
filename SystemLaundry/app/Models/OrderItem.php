<?php

namespace App\Models;

use App\Enums\PricingUnit;
use Carbon\CarbonImmutable;
use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property int $service_id
 * @property string $service_name
 * @property PricingUnit $pricing_unit
 * @property string $quantity
 * @property string $unit_price
 * @property string $line_total
 * @property int|null $piece_count
 * @property string|null $notes
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Order $order
 * @property-read Service $service
 */
#[Fillable([
    'order_id', 'service_id', 'service_name', 'pricing_unit', 'quantity',
    'unit_price', 'line_total', 'piece_count', 'notes',
])]
class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pricing_unit' => PricingUnit::class,
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'line_total' => 'decimal:2',
            'piece_count' => 'integer',
        ];
    }

    /**
     * Build an item with the service's current name/price snapshotted onto it.
     *
     * @return array<string, mixed>
     */
    public static function snapshotFor(Service $service, float $quantity): array
    {
        return [
            'service_id' => $service->id,
            'service_name' => $service->name,
            'pricing_unit' => $service->pricing_unit,
            'quantity' => $quantity,
            'unit_price' => $service->price,
            'line_total' => $service->lineTotal($quantity),
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
