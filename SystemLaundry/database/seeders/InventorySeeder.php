<?php

namespace Database\Seeders;

use App\Enums\StockMovementType;
use App\Enums\UserRole;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    private const WEEKS = 9;

    /**
     * Fabric conditioner and bleach are never restocked, so they end below their reorder level
     * and show up as low-stock alerts.
     */
    private const ITEMS = [
        ['sku' => 'SUP-DET-PWD', 'name' => 'Powder Detergent', 'unit' => 'kg', 'reorder' => 10, 'cost' => 95, 'opening' => 60, 'weekly_usage' => 7, 'restock' => true],
        ['sku' => 'SUP-DET-LIQ', 'name' => 'Liquid Detergent', 'unit' => 'L', 'reorder' => 8, 'cost' => 120, 'opening' => 40, 'weekly_usage' => 4, 'restock' => true],
        ['sku' => 'SUP-SOFT', 'name' => 'Fabric Conditioner', 'unit' => 'L', 'reorder' => 8, 'cost' => 110, 'opening' => 40, 'weekly_usage' => 4.5, 'restock' => false],
        ['sku' => 'SUP-BLCH', 'name' => 'Color-safe Bleach', 'unit' => 'L', 'reorder' => 4, 'cost' => 60, 'opening' => 15, 'weekly_usage' => 1.4, 'restock' => false],
        ['sku' => 'SUP-STAIN', 'name' => 'Stain Remover', 'unit' => 'L', 'reorder' => 2, 'cost' => 180, 'opening' => 6, 'weekly_usage' => 0.5, 'restock' => true],
        ['sku' => 'SUP-BAG', 'name' => 'Plastic Laundry Bags', 'unit' => 'pcs', 'reorder' => 200, 'cost' => 2.5, 'opening' => 1500, 'weekly_usage' => 160, 'restock' => true],
        ['sku' => 'SUP-TAG', 'name' => 'QR Tag Stickers', 'unit' => 'pcs', 'reorder' => 200, 'cost' => 1, 'opening' => 1000, 'weekly_usage' => 160, 'restock' => true],
        ['sku' => 'SUP-HANG', 'name' => 'Plastic Hangers', 'unit' => 'pcs', 'reorder' => 50, 'cost' => 8, 'opening' => 200, 'weekly_usage' => 15, 'restock' => true],
    ];

    public function run(): void
    {
        $admin = User::role(UserRole::Admin->value)->first();
        $staff = User::role(UserRole::Staff->value)->where('is_active', true)->get();
        $start = CarbonImmutable::now()->startOfDay()->subWeeks(self::WEEKS);

        foreach (self::ITEMS as $supply) {
            $item = InventoryItem::query()->create([
                'sku' => $supply['sku'],
                'name' => $supply['name'],
                'unit' => $supply['unit'],
                'quantity_on_hand' => 0,
                'reorder_level' => $supply['reorder'],
                'unit_cost' => $supply['cost'],
            ]);

            $balance = $this->record($item, 0.0, StockMovementType::In, $supply['opening'], $start->setTime(8, 0), $admin, 'Opening stock');

            for ($week = 1; $week <= self::WEEKS; $week++) {
                $weekStart = $start->addWeeks($week);

                if ($supply['restock'] && $balance <= $supply['reorder'] * 1.5) {
                    $balance = $this->record($item, $balance, StockMovementType::In, $supply['opening'], $weekStart->setTime(9, 0), $admin, 'Supplier delivery');
                }

                // Usage varies ±20% week to week; never go below zero.
                $usage = min(round($supply['weekly_usage'] * fake()->randomFloat(2, 0.8, 1.2), 2), $balance);

                if ($usage > 0) {
                    $balance = $this->record($item, $balance, StockMovementType::Out, -$usage, $weekStart->addDays(6)->setTime(18, 0), $staff->random(), 'Weekly usage');
                }
            }

            if ($supply['sku'] === 'SUP-DET-PWD') {
                $balance = $this->record($item, $balance, StockMovementType::Adjustment, -1.5, CarbonImmutable::now()->subDays(2)->setTime(17, 30), $admin, 'Physical count correction (spilled bag)');
            }

            $item->forceFill(['quantity_on_hand' => $balance])->save();
        }
    }

    /**
     * Append one ledger row and return the new running balance.
     */
    private function record(InventoryItem $item, float $balance, StockMovementType $type, float $change, CarbonImmutable $at, ?User $user, string $remarks): float
    {
        $balance = round($balance + $change, 2);

        StockMovement::query()->create([
            'inventory_item_id' => $item->id,
            'type' => $type,
            'quantity_change' => $change,
            'balance_after' => $balance,
            'user_id' => $user?->id,
            'remarks' => $remarks,
            'created_at' => $at,
        ]);

        return $balance;
    }
}
