<?php

namespace Database\Factories;

use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryItem>
 */
class InventoryItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => strtoupper(fake()->unique()->bothify('SUP-###??')),
            'name' => ucfirst(fake()->unique()->word()).' '.fake()->word(),
            'unit' => fake()->randomElement(['kg', 'L', 'pcs', 'pack']),
            'quantity_on_hand' => fake()->numberBetween(10, 100),
            'reorder_level' => 5,
            'unit_cost' => fake()->randomElement([45, 80, 120, 250]),
            'is_active' => true,
        ];
    }

    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'quantity_on_hand' => 2,
            'reorder_level' => 5,
        ]);
    }
}
