<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItem>
 */
class OrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'service_id' => Service::factory(),
            'quantity' => fake()->randomFloat(1, 2, 8),
            'piece_count' => fake()->optional(0.7)->numberBetween(5, 40),
        ];
    }

    /**
     * Fill the name/price snapshot from the related service.
     */
    public function configure(): static
    {
        return $this->afterMaking(function (OrderItem $item) {
            $service = Service::findOrFail($item->service_id);
            $item->forceFill(OrderItem::snapshotFor($service, (float) $item->quantity));
        });
    }
}
