<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Demo accounts (password: "password"). In production only the owner account is created,
     * with the credentials from config/laundry.php (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
     *
     * @var list<array{name: string, email: string, phone: string, role: UserRole}>
     */
    private const DEMO_USERS = [
        ['name' => 'Rosa Villanueva', 'email' => 'admin@laundry.test', 'phone' => '09171110001', 'role' => UserRole::Admin],
        ['name' => 'Carla Mendoza', 'email' => 'cashier@laundry.test', 'phone' => '09171110002', 'role' => UserRole::Cashier],
        ['name' => 'Jun Reyes', 'email' => 'cashier2@laundry.test', 'phone' => '09171110003', 'role' => UserRole::Cashier],
        ['name' => 'Ben Aquino', 'email' => 'staff@laundry.test', 'phone' => '09171110004', 'role' => UserRole::Staff],
        ['name' => 'Lito Ramos', 'email' => 'staff2@laundry.test', 'phone' => '09171110005', 'role' => UserRole::Staff],
        ['name' => 'Grace Torres', 'email' => 'staff3@laundry.test', 'phone' => '09171110006', 'role' => UserRole::Staff],
        ['name' => 'Dodong Flores', 'email' => 'rider@laundry.test', 'phone' => '09171110007', 'role' => UserRole::Rider],
        ['name' => 'Mike Castillo', 'email' => 'rider2@laundry.test', 'phone' => '09171110008', 'role' => UserRole::Rider],
        ['name' => 'Juan Dela Cruz', 'email' => 'customer@laundry.test', 'phone' => '09181234567', 'role' => UserRole::Customer],
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            $password = config()->string('laundry.seed_admin.password', '');

            $this->createUser([
                'name' => 'Shop Owner',
                'email' => config()->string('laundry.seed_admin.email'),
                'phone' => null,
                'role' => UserRole::Admin,
            ], $password !== '' ? $password : Str::password(16));

            return;
        }

        foreach (self::DEMO_USERS as $user) {
            $this->createUser($user, 'password');
        }

        // An inactive account to demonstrate deactivation in the Users page.
        $this->createUser([
            'name' => 'Paolo Navarro',
            'email' => 'former.staff@laundry.test',
            'phone' => '09171110009',
            'role' => UserRole::Staff,
        ], 'password', active: false);
    }

    /**
     * @param  array{name: string, email: string, phone: string|null, role: UserRole}  $data
     */
    private function createUser(array $data, string $password, bool $active = true): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => $data['email']],
            [
                'name' => $data['name'],
                'phone' => $data['phone'],
                'password' => $password,
                'is_active' => $active,
            ],
        );

        // Seeded accounts are trusted, so skip the email verification step.
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save();
        $user->syncRoles([$data['role']->value]);
    }
}
