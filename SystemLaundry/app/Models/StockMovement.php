<?php

namespace App\Models;

use App\Enums\StockMovementType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $inventory_item_id
 * @property StockMovementType $type
 * @property string $quantity_change
 * @property string $balance_after
 * @property int|null $user_id
 * @property int|null $order_id
 * @property string|null $remarks
 * @property CarbonImmutable $created_at
 * @property-read InventoryItem $item
 * @property-read User|null $user
 * @property-read Order|null $order
 */
#[Fillable(['inventory_item_id', 'type', 'quantity_change', 'balance_after', 'user_id', 'order_id', 'remarks', 'created_at'])]
class StockMovement extends Model
{
    // Ledger rows are append-only.
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'quantity_change' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<InventoryItem, $this>
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
