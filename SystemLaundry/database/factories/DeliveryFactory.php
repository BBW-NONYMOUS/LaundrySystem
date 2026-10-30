<?php

namespace Database\Factories;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Models\Delivery;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Delivery>
 */
class DeliveryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $faker = \Faker\Factory::create('en_PH');
        $faker->seed(fake()->randomNumber(9));

        return [
            'order_id' => Order::factory(),
            'type' => DeliveryType::Delivery,
            'status' => DeliveryStatus::Scheduled,
            'rider_id' => null,
            'assigned_by' => null,
            'scheduled_at' => now()->addDay()->setTime(fake()->randomElement([9, 13, 16]), 0),
            'address' => $faker->address(),
            'contact_phone' => '09'.fake()->numerify('#########'),
            'attempts' => 0,
        ];
    }

    public function pickup(): static
    {
        return $this->state(fn (array $attributes) => ['type' => DeliveryType::Pickup]);
    }
}
