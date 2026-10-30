<?php

namespace Database\Factories;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PricingUnit;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $receivedAt = now()->subHours(fake()->numberBetween(1, 20));

        return [
            // Test orders use a separate "TST" prefix so they never collide with OrderSequence numbers.
            'order_number' => 'TST-'.$receivedAt->format('Ymd').'-'.fake()->unique()->numerify('#####'),
            'tracking_code' => strtoupper(fake()->unique()->bothify('????########')),
            'customer_id' => Customer::factory(),
            'created_by' => User::factory(),
            'status' => OrderStatus::Received,
            'payment_status' => PaymentStatus::Unpaid,
            'is_express' => false,
            'subtotal' => 0,
            'express_fee' => 0,
            'delivery_fee' => 0,
            'discount_amount' => 0,
            'total_amount' => 0,
            'amount_paid' => 0,
            'special_instructions' => fake()->optional(0.2)->randomElement([
                'Do not use bleach',
                'Separate colored clothes',
                'Fold, do not hang',
                'Iron polo shirts only',
            ]),
            'received_at' => $receivedAt,
            'due_at' => $receivedAt->addHours(48),
        ];
    }

    /**
     * Add 1-3 priced items and compute the totals.
     */
    public function withItems(int $count = 2): static
    {
        return $this->afterCreating(function (Order $order) use ($count) {
            $services = Service::query()->active()->get();

            if ($services->isEmpty()) {
                $services = Service::factory()->count($count)->create();
            }

            foreach ($services->random(min($count, $services->count())) as $service) {
                $quantity = $service->pricing_unit === PricingUnit::PerKg
                    ? fake()->randomFloat(1, 2, 9)
                    : fake()->numberBetween(1, 4);

                $order->items()->create(OrderItem::snapshotFor($service, $quantity));
            }

            $order->recalculateTotals(Setting::float('express_surcharge_percent'));
        });
    }

    /**
     * Record the initial status history entry, like OrderService will in Phase 3.
     */
    public function withHistory(): static
    {
        return $this->afterCreating(function (Order $order) {
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => $order->status,
                'changed_by' => $order->created_by,
                'created_at' => $order->received_at ?? now(),
            ]);
        });
    }

    public function status(OrderStatus $status): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status,
            'ready_at' => in_array($status, [OrderStatus::Ready, OrderStatus::OutForDelivery, OrderStatus::Completed, OrderStatus::Delivered], true)
                ? now()->subHours(2)
                : null,
            'completed_at' => in_array($status, [OrderStatus::Completed, OrderStatus::Delivered], true) ? now() : null,
            'cancelled_at' => $status === OrderStatus::Cancelled ? now() : null,
            'cancellation_reason' => $status === OrderStatus::Cancelled ? 'Customer changed mind' : null,
        ]);
    }

    public function express(): static
    {
        return $this->state(fn (array $attributes) => ['is_express' => true]);
    }

    /**
     * Still being processed but already past its due time.
     */
    public function overdue(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Washing,
            'received_at' => now()->subDays(4),
            'due_at' => now()->subDays(2),
        ]);
    }

    /**
     * Ready on the shelf for more than $days days.
     */
    public function unclaimed(int $days = 10): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Ready,
            'received_at' => now()->subDays($days + 2),
            'due_at' => now()->subDays($days),
            'ready_at' => now()->subDays($days),
        ]);
    }

    /**
     * A booked pickup that has not reached the shop yet.
     */
    public function pendingPickup(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => OrderStatus::Pending,
            'received_at' => null,
            'due_at' => null,
        ]);
    }
}
