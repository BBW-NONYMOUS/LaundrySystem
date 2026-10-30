<?php

namespace Database\Factories;

use App\Enums\ContactMessageStatus;
use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->firstName().' '.fake()->lastName(),
            'email' => fake()->safeEmail(),
            'phone' => '09'.fake()->numerify('#########'),
            'subject' => fake()->randomElement(['Business account', 'Pricing question', 'Lost item', 'Pickup area']),
            'message' => fake()->paragraph(),
            'status' => ContactMessageStatus::New,
            'ip_address' => fake()->ipv4(),
        ];
    }
}
