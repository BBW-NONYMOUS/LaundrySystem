<?php

namespace Tests\Concerns;

use App\Enums\PricingUnit;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\SettingSeeder;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared setup for feature tests: real roles/permissions and default settings,
 * plus quick ways to make staff, services and orders.
 */
trait SetsUpLaundry
{
    protected function setUpLaundry(): void
    {
        $this->seed([RolePermissionSeeder::class, SettingSeeder::class]);
    }

    protected function userWithRole(UserRole $role): User
    {
        return User::factory()->role($role)->create();
    }

    protected function admin(): User
    {
        return $this->userWithRole(UserRole::Admin);
    }

    protected function cashier(): User
    {
        return $this->userWithRole(UserRole::Cashier);
    }

    protected function staff(): User
    {
        return $this->userWithRole(UserRole::Staff);
    }

    protected function rider(): User
    {
        return $this->userWithRole(UserRole::Rider);
    }

    /**
     * Wash, Dry & Fold at ₱35/kg, minimum 3 kg, 24 h (8 h express).
     */
    protected function washDryFold(): Service
    {
        // Reused when a test needs it more than once (code and name are unique).
        return Service::query()->where('code', 'WDF')->first() ?? Service::factory()->create([
            'code' => 'WDF',
            'name' => 'Wash, Dry & Fold',
            'pricing_unit' => PricingUnit::PerKg,
            'price' => 35,
            'min_quantity' => 3,
            'turnaround_hours' => 24,
            'express_turnaround_hours' => 8,
        ]);
    }

    /**
     * A walk-in order already in the shop, with one priced item.
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function orderWithItems(array $attributes = [], float $kilos = 4): Order
    {
        $order = Order::factory()->create(['customer_id' => Customer::factory(), ...$attributes]);
        $order->items()->create(OrderItem::snapshotFor(Service::query()->first() ?? $this->washDryFold(), $kilos));
        $order->recalculateTotals(50);

        return $order->refresh();
    }

    /**
     * Assert an Inertia page and its props, including that the React page file exists.
     *
     * @param  TestResponse<Response>  $response
     */
    protected function assertPage(TestResponse $response, string $component, ?callable $props = null): void
    {
        $response->assertOk()->assertInertia(function (AssertableInertia $page) use ($component, $props) {
            $page->component($component);

            if ($props !== null) {
                $props($page);
            }
        });
    }
}
