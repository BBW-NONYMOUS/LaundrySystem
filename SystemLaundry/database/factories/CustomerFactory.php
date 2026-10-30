<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * Common Filipino names (Faker has no en_PH person provider).
     *
     * @var list<string>
     */
    private const FIRST_NAMES = [
        'Juan', 'Maria', 'Jose', 'Ana', 'Mark', 'Kristine', 'John Paul', 'Mary Grace', 'Angelo', 'Jasmine',
        'Carlo', 'Patricia', 'Miguel', 'Camille', 'Rafael', 'Nicole', 'Paolo', 'Bea', 'Joshua', 'Andrea',
        'Christian', 'Erika', 'Kenneth', 'Rhea', 'Vincent', 'Joy', 'Ramon', 'Liza', 'Jerome', 'Shiela',
    ];

    /**
     * @var list<string>
     */
    private const LAST_NAMES = [
        'Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Bautista', 'Villanueva', 'Ramos', 'Aquino', 'Castillo',
        'Rivera', 'Torres', 'Flores', 'Gonzales', 'Navarro', 'Fernandez', 'Lopez', 'Del Rosario', 'Pascual', 'Soriano',
        'Mercado', 'Domingo', 'Salazar', 'Valdez', 'Rodriguez', 'Cruz', 'Tolentino', 'Manalo', 'Ocampo', 'Panganiban',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $faker = \Faker\Factory::create('en_PH');
        // Derive the seed from the default generator so seeded runs stay reproducible.
        $faker->seed(fake()->randomNumber(9));

        return [
            'user_id' => null,
            'name' => fake()->randomElement(self::FIRST_NAMES).' '.fake()->randomElement(self::LAST_NAMES),
            'phone' => '09'.fake()->unique()->numerify('#########'),
            'email' => fake()->optional(0.6)->safeEmail(),
            'address' => $faker->address(),
            'notes' => fake()->optional(0.15)->randomElement([
                'Prefers unscented fabric softener',
                'Separate white clothes',
                'Hang dry delicate items',
                'Call before delivery',
                'Regular customer - every Saturday',
            ]),
        ];
    }
}
