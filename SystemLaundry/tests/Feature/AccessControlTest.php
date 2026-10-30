<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
    }

    /**
     * Page access per role, matching the matrix in docs/01-system-planning.md §3.
     *
     * @return array<string, array{0: UserRole, 1: string, 2: int}>
     */
    public static function pageAccess(): array
    {
        return [
            'admin reports' => [UserRole::Admin, 'reports.index', 200],
            'admin users' => [UserRole::Admin, 'users.index', 200],
            'admin activity log' => [UserRole::Admin, 'activity-log.index', 200],
            'admin shop settings' => [UserRole::Admin, 'shop.edit', 200],
            'cashier orders' => [UserRole::Cashier, 'orders.index', 200],
            'cashier new order' => [UserRole::Cashier, 'orders.create', 200],
            'cashier payments' => [UserRole::Cashier, 'payments.index', 200],
            'cashier deliveries' => [UserRole::Cashier, 'deliveries.index', 200],
            'cashier daily summary' => [UserRole::Cashier, 'reports.daily', 200],
            'cashier full reports' => [UserRole::Cashier, 'reports.index', 403],
            'cashier services' => [UserRole::Cashier, 'services.index', 403],
            'cashier users' => [UserRole::Cashier, 'users.index', 403],
            'staff board' => [UserRole::Staff, 'orders.board', 200],
            'staff inventory' => [UserRole::Staff, 'inventory.index', 200],
            'staff payments' => [UserRole::Staff, 'payments.index', 403],
            'staff reports' => [UserRole::Staff, 'reports.daily', 403],
            'rider trips' => [UserRole::Rider, 'rider.deliveries.index', 200],
            'rider orders' => [UserRole::Rider, 'orders.index', 403],
            'customer portal' => [UserRole::Customer, 'portal.index', 200],
            'customer orders' => [UserRole::Customer, 'orders.index', 403],
        ];
    }

    #[DataProvider('pageAccess')]
    public function test_role_page_access(UserRole $role, string $route, int $status): void
    {
        $user = $this->userWithRole($role);

        if ($role === UserRole::Customer) {
            Customer::factory()->create(['user_id' => $user->id]);
        }

        $this->actingAs($user)->get(route($route))->assertStatus($status);
    }

    public function test_dashboard_sends_riders_and_customers_to_their_own_home(): void
    {
        $this->actingAs($this->rider())->get(route('dashboard'))->assertRedirect(route('rider.deliveries.index'));

        $customer = $this->userWithRole(UserRole::Customer);
        $this->actingAs($customer)->get(route('dashboard'))->assertRedirect(route('portal.index'));
    }

    public function test_owner_dashboard_has_stats_and_deferred_analytics(): void
    {
        $this->orderWithItems();

        $this->assertPage(
            $this->actingAs($this->admin())->get(route('dashboard')),
            'dashboard',
            fn ($page) => $page->has('stats.sales_today')->has('recentOrders', 1)->missing('analytics')
                ->loadDeferredProps(fn ($reload) => $reload->has('analytics.salesTrend', 30)->has('analytics.peakHours', 14)),
        );

        // Counter staff get the operational numbers but no analytics.
        $this->assertPage(
            $this->actingAs($this->cashier())->get(route('dashboard')),
            'dashboard',
            fn ($page) => $page->has('stats.overdue')->where('analytics', null),
        );
    }

    public function test_shared_props_include_role_and_permissions(): void
    {
        $this->actingAs($this->staff())->get(route('orders.board'))
            ->assertInertia(fn ($page) => $page
                ->where('auth.user.role', 'staff')
                ->where('auth.user.permissions', fn ($permissions) => collect($permissions)->contains('orders.update-status')
                    && collect($permissions)->doesntContain('payments.void'))
                ->where('shop.currency_symbol', '₱')
                ->has('orderStatuses', 10));
    }

    public function test_customers_see_only_their_own_orders(): void
    {
        $user = $this->userWithRole(UserRole::Customer);
        $mine = Order::factory()->create(['customer_id' => Customer::factory()->create(['user_id' => $user->id])]);
        $theirs = Order::factory()->create();

        $this->actingAs($user)->get(route('portal.orders.show', $mine))->assertOk();
        $this->actingAs($user)->get(route('portal.orders.show', $theirs))->assertForbidden();
    }

    public function test_deactivated_staff_cannot_log_in_and_are_signed_out(): void
    {
        $user = User::factory()->role(UserRole::Cashier)->inactive()->create();

        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($user)->get(route('orders.index'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_public_tracking_uses_the_tracking_code_and_hides_private_details(): void
    {
        $order = $this->orderWithItems();

        $this->assertPage(
            $this->get(route('tracking.show', $order->tracking_code)),
            'track/show',
            fn ($page) => $page->where('order.order_number', $order->order_number)
                ->missing('order.customer')
                ->missing('order.payments'),
        );

        // The sequential order number must not work as a tracking code.
        $this->get(route('tracking.show', $order->order_number))->assertNotFound();
    }

    public function test_owner_manages_staff_but_cannot_lock_themselves_out(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('users.store'), [
            'name' => 'New Rider', 'email' => 'newrider@laundry.test', 'role' => 'rider',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertSessionHasNoErrors();
        $this->assertTrue(User::where('email', 'newrider@laundry.test')->sole()->hasRole('rider'));

        $this->actingAs($admin)->put(route('users.update', $admin), [
            'name' => $admin->name, 'email' => $admin->email, 'role' => 'cashier',
        ])->assertSessionHasErrors('role');

        $this->actingAs($admin)->patch(route('users.toggle-active', $admin))->assertSessionHasErrors('user');
        $this->assertTrue($admin->refresh()->is_active);
    }
}
