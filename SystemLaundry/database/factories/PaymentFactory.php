<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $amount = fake()->randomElement([100, 150, 245, 300, 420]);

        return [
            'order_id' => Order::factory(),
            'received_by' => User::factory(),
            'method' => PaymentMethod::Cash,
            'reference_number' => null,
            'amount' => $amount,
            'amount_tendered' => ceil($amount / 100) * 100,
            'paid_at' => now(),
        ];
    }

    public function gcash(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => PaymentMethod::GCash,
            'reference_number' => fake()->numerify('#############'),
            'amount_tendered' => null,
        ]);
    }

    public function voided(): static
    {
        return $this->state(fn (array $attributes) => [
            'voided_at' => now(),
            'voided_by' => User::factory(),
            'void_reason' => 'Wrong amount entered',
        ]);
    }
}
