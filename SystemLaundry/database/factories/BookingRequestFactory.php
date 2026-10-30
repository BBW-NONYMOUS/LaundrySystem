<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Enums\PickupSlot;
use App\Models\BookingRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingRequest>
 */
class BookingRequestFactory extends Factory
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
        $date = now()->addDays(fake()->numberBetween(1, 5));

        return [
            'reference' => BookingRequest::generateReference(),
            'status' => BookingStatus::Pending,
            'name' => fake()->firstName().' '.fake()->lastName(),
            'phone' => '09'.fake()->unique()->numerify('#########'),
            'email' => fake()->optional(0.5)->safeEmail(),
            'address' => $faker->address(),
            'pickup_date' => $date->toDateString(),
            'time_slot' => fake()->randomElement(PickupSlot::cases()),
            'service_id' => null,
            'estimated_quantity' => fake()->randomElement([null, 3, 5, 6.5, 8]),
            'is_express' => false,
            'wants_delivery' => fake()->boolean(60),
            'special_instructions' => null,
            'ip_address' => fake()->ipv4(),
        ];
    }

    public function forSlot(string $date, PickupSlot $slot): static
    {
        return $this->state(fn (array $attributes) => ['pickup_date' => $date, 'time_slot' => $slot]);
    }

    public function declined(string $reason = 'Outside our pickup area'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => BookingStatus::Declined,
            'decline_reason' => $reason,
            'handled_at' => now(),
        ]);
    }
}
