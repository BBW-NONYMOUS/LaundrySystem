<?php

namespace App\Services;

use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\StockMovement;
use App\Models\User;
use App\Notifications\LowStockAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Writes the stock ledger and keeps inventory_items.quantity_on_hand in sync.
 */
class InventoryService
{
    /**
     * @param  float  $quantity  Positive amount for stock in/out; signed amount for adjustments.
     */
    public function record(
        InventoryItem $item,
        StockMovementType $type,
        float $quantity,
        User $actor,
        ?string $remarks = null,
        ?Order $order = null,
    ): StockMovement {
        return DB::transaction(function () use ($item, $type, $quantity, $actor, $remarks, $order) {
            /** @var InventoryItem $item */
            $item = InventoryItem::query()->lockForUpdate()->findOrFail($item->getKey());

            $change = match ($type) {
                StockMovementType::In => abs($quantity),
                StockMovementType::Out => -abs($quantity),
                StockMovementType::Adjustment => $quantity,
            };

            if ($change == 0) {
                throw ValidationException::withMessages(['quantity' => 'Enter a quantity other than zero.']);
            }

            $before = (float) $item->quantity_on_hand;
            $after = round($before + $change, 2);

            if ($after < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$before} {$item->unit} left in stock.",
                ]);
            }

            $movement = $item->movements()->create([
                'type' => $type,
                'quantity_change' => $change,
                'balance_after' => $after,
                'user_id' => $actor->id,
                'order_id' => $order?->id,
                'remarks' => $remarks,
                'created_at' => now(),
            ]);

            $item->update(['quantity_on_hand' => $after]);

            // Alert only when the item crosses the line, not on every movement while it stays low.
            if ($before > (float) $item->reorder_level && $item->isLowStock()) {
                Notification::send(User::withActiveRole(UserRole::Admin)->get(), new LowStockAlert($item));
            }

            return $movement;
        });
    }
}
