<?php

namespace Database\Factories;

use App\Enums\PricingUnit;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'name' => fake()->unique()->words(3, true),
            'description' => fake()->sentence(),
            'pricing_unit' => PricingUnit::PerKg,
            'price' => fake()->randomElement([25, 30, 35, 40, 60]),
            'min_quantity' => 3,
            'turnaround_hours' => 48,
            'express_turnaround_hours' => 24,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    public function perItem(): static
    {
        return $this->state(fn (array $attributes) => [
            'pricing_unit' => PricingUnit::PerItem,
            'price' => fake()->randomElement([25, 150, 180, 250]),
            'min_quantity' => 1,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }
}
