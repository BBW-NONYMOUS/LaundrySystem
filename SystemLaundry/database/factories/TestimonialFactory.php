<?php

namespace Database\Factories;

use App\Models\Testimonial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Testimonial>
 */
class TestimonialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'customer_id' => null,
            'order_id' => null,
            'author_name' => Testimonial::displayName(fake()->firstName().' '.fake()->lastName()),
            'rating' => fake()->numberBetween(4, 5),
            'comment' => fake()->sentence(14),
            'source' => Testimonial::SOURCE_FEEDBACK,
            'is_approved' => false,
            'is_featured' => false,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => ['is_approved' => true, 'approved_at' => now()]);
    }

    public function featured(): static
    {
        return $this->approved()->state(fn (array $attributes) => ['is_featured' => true]);
    }
}
