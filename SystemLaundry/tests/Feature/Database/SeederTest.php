<?php

namespace Tests\Feature\Database;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\OrderSequence;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_demo_accounts_have_the_right_permissions(): void
    {
        $admin = User::where('email', 'admin@laundry.test')->firstOrFail();
        $cashier = User::where('email', 'cashier@laundry.test')->firstOrFail();
        $staff = User::where('email', 'staff@laundry.test')->firstOrFail();
        $rider = User::where('email', 'rider@laundry.test')->firstOrFail();

        $this->assertTrue($admin->hasRole(UserRole::Admin->value));
        $this->assertTrue($admin->can(Permission::SettingsManage->value));
        $this->assertTrue($cashier->can(Permission::OrdersCreate->value));
        $this->assertFalse($cashier->can(Permission::PaymentsVoid->value));
        $this->assertTrue($staff->can(Permission::OrdersUpdateStatus->value));
        $this->assertFalse($staff->can(Permission::OrdersCreate->value));
        $this->assertTrue($rider->can(Permission::DeliveriesOwn->value));
        $this->assertFalse($rider->can(Permission::ReportsView->value));
    }

    public function test_every_order_total_and_payment_cache_is_consistent(): void
    {
        $orders = Order::withSum('items', 'line_total')
            ->withSum(['payments' => fn ($query) => $query->whereNull('voided_at')], 'amount')
            ->get();

        $this->assertGreaterThan(300, $orders->count());

        foreach ($orders as $order) {
            $expectedTotal = max(0, (float) $order->subtotal + (float) $order->express_fee + (float) $order->delivery_fee - (float) $order->discount_amount);

            $this->assertEqualsWithDelta((float) $order->items_sum_line_total, (float) $order->subtotal, 0.009, $order->order_number);
            $this->assertEqualsWithDelta($expectedTotal, (float) $order->total_amount, 0.009, $order->order_number);
            $this->assertEqualsWithDelta((float) $order->payments_sum_amount, (float) $order->amount_paid, 0.009, $order->order_number);
        }
    }

    public function test_released_orders_are_fully_paid(): void
    {
        $this->assertSame(0, Order::whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered])
            ->where('payment_status', '!=', PaymentStatus::Paid)
            ->count());
    }

    public function test_status_histories_follow_the_state_machine(): void
    {
        foreach (Order::with('statusHistories')->get() as $order) {
            $previous = null;

            foreach ($order->statusHistories as $history) {
                $this->assertSame($previous, $history->from_status, $order->order_number);

                if ($previous !== null) {
                    $this->assertTrue($previous->canTransitionTo($history->to_status), "{$order->order_number}: {$previous->value} -> {$history->to_status->value}");
                }

                $previous = $history->to_status;
            }

            $this->assertSame($order->status, $previous, $order->order_number);
        }
    }

    public function test_order_sequences_continue_after_seeded_numbers(): void
    {
        $today = OrderSequence::find(now()->toDateString());
        $highestToday = Order::where('order_number', 'like', 'LND-'.now()->format('Ymd').'-%')->max('order_number');

        $this->assertNotNull($today);
        $this->assertSame(sprintf('LND-%s-%04d', now()->format('Ymd'), $today->last_number), $highestToday);
    }

    public function test_demo_data_covers_monitoring_scenarios(): void
    {
        $this->assertGreaterThan(0, Order::unclaimed(7)->count());
        $this->assertGreaterThan(0, Order::where('status', OrderStatus::Cancelled)->count());
        $this->assertGreaterThan(0, Order::where('status', OrderStatus::Pending)->count());
        $this->assertGreaterThan(0, InventoryItem::lowStock()->count());
    }
}
