<?php

namespace Database\Seeders;

use App\Enums\PricingUnit;
use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    /**
     * Typical neighborhood laundry shop price list (₱).
     *
     * @var list<array{0: string, 1: string, 2: PricingUnit, 3: int, 4: int, 5: int, 6: int|null, 7: string}>
     */
    private const SERVICES = [
        // code, name, unit, price, min qty, turnaround h, express h, public description (docs/public-site/04 §4)
        ['WDF', 'Wash, Dry & Fold', PricingUnit::PerKg, 35, 3, 24, 8, 'Everyday clothes washed, tumble-dried and neatly folded, ready for your closet.'],
        ['WO', 'Wash Only', PricingUnit::PerKg, 20, 3, 24, 8, 'Washed and spun dry. You dry and fold at home.'],
        ['DO', 'Dry Only', PricingUnit::PerKg, 20, 3, 24, 8, 'Tumble-drying for clothes you’ve already washed.'],
        ['WDP', 'Wash, Dry & Press', PricingUnit::PerKg, 60, 3, 48, 24, 'Washed, dried and steam-pressed, returned on hangers.'],
        ['IRN', 'Ironing / Pressing', PricingUnit::PerItem, 25, 1, 24, 6, 'Per-piece pressing for polos, slacks, uniforms and dresses.'],
        ['BED', 'Bedsheets & Pillowcases', PricingUnit::PerKg, 45, 2, 48, 24, 'Washed separately in a hot cycle for fresher, cleaner sleep.'],
        ['COMF', 'Comforter / Blanket', PricingUnit::PerItem, 180, 1, 48, 24, 'Bulky items washed one at a time so they come out fluffy.'],
        ['CURT', 'Curtains', PricingUnit::PerKg, 60, 2, 72, 48, 'Gentle wash for curtains and drapes. Please remove the hooks first.'],
        ['DC', 'Dry Cleaning', PricingUnit::PerItem, 250, 1, 72, 48, 'Barong, gowns, suits and delicate fabrics.'],
        ['SHOE', 'Shoe Cleaning', PricingUnit::PerItem, 200, 1, 72, null, 'Deep clean for sneakers and canvas shoes, inside and out.'],
    ];

    public function run(): void
    {
        foreach (self::SERVICES as $index => [$code, $name, $unit, $price, $min, $turnaround, $express, $description]) {
            $service = Service::query()->firstOrNew(['code' => $code]);

            // Descriptions are customer-facing website copy; never overwrite the owner's edits.
            if (! $service->exists) {
                $service->description = $description;
            }

            $service->fill([
                'name' => $name,
                'pricing_unit' => $unit,
                'price' => $price,
                'min_quantity' => $min,
                'turnaround_hours' => $turnaround,
                'express_turnaround_hours' => $express,
                'is_active' => true,
                'sort_order' => $index + 1,
            ])->save();
        }
    }
}
