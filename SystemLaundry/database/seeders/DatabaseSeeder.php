<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    // Model events are muted while seeding so the activity log only holds real user actions.
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            SettingSeeder::class,
            UserSeeder::class,
            ServiceSeeder::class,
            FaqSeeder::class,
        ]);

        // Sample customers, orders, stock history and website activity are for development/demo only.
        if (! app()->isProduction()) {
            $this->call([
                InventorySeeder::class,
                DemoDataSeeder::class,
                PublicSiteDemoSeeder::class,
            ]);
        }
    }
}
