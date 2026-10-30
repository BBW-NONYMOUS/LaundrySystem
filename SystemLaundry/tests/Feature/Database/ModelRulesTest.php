<?php

namespace Tests\Feature\Database;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PricingUnit;
use App\Models\Customer;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Setting;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_phone_numbers_are_normalized_to_one_format(): void
    {
        $this->assertSame('09171234567', Customer::normalizePhone('+63 917 123 4567'));
        $this->assertSame('09171234567', Customer::normalizePhone('639171234567'));
        $this->assertSame('09171234567', Customer::normalizePhone('0917-123-4567'));
        $this->assertSame('09171234567', Customer::normalizePhone('9171234567'));
    }

    public function test_the_same_phone_written_differently_cannot_create_a_duplicate_customer(): void
    {
        Customer::factory()->create(['phone' => '0917-123-4567']);

        $this->expectException(QueryException::class);

        Customer::factory()->create(['phone' => '+63 917 123 4567']);
    }

    public function test_customer_names_are_tidied_on_save(): void
    {
        $customer = Customer::factory()->create(['name' => '  juan   dela cruz ']);

        $this->assertSame('Juan Dela Cruz', $customer->name);
    }

    public function test_customer_search_matches_name_or_any_phone_format(): void
    {
        $maria = Customer::factory()->create(['name' => 'Maria Santos', 'phone' => '09181112222']);
        Customer::factory()->create(['name' => 'Jose Reyes', 'phone' => '09993334444']);

        $this->assertTrue(Customer::search('santos')->get()->contains($maria));
        $this->assertTrue(Customer::search('+63 918 111')->get()->contains($maria));
        $this->assertCount(2, Customer::search(null)->get());
    }

    public function test_per_kilo_items_apply_the_minimum_quantity(): void
    {
        $service = Service::factory()->create(['pricing_unit' => PricingUnit::PerKg, 'price' => 35, 'min_quantity' => 3]);

        $this->assertSame(105.0, $service->lineTotal(2.4));
        $this->assertSame(175.0, $service->lineTotal(5));
    }

    public function test_order_item_snapshots_the_price_at_time_of_order(): void
    {
        $service = Service::factory()->create(['name' => 'Wash, Dry & Fold', 'price' => 35, 'min_quantity' => 3]);
        $order = Order::factory()->create();
        $item = $order->items()->create(OrderItem::snapshotFor($service, 4));

        $service->update(['price' => 50, 'name' => 'Premium Wash']);

        $item->refresh();
        $this->assertSame('35.00', $item->unit_price);
        $this->assertSame('140.00', $item->line_total);
        $this->assertSame('Wash, Dry & Fold', $item->service_name);
    }

    public function test_totals_include_express_surcharge_delivery_fee_and_discount(): void
    {
        $service = Service::factory()->create(['price' => 35, 'min_quantity' => 3]);
        $order = Order::factory()->express()->create(['delivery_fee' => 50, 'discount_amount' => 20]);
        $order->items()->create(OrderItem::snapshotFor($service, 4)); // 140.00

        $order->recalculateTotals(expressSurchargePercent: 50);

        $this->assertSame('140.00', $order->subtotal);
        $this->assertSame('70.00', $order->express_fee);
        $this->assertSame('240.00', $order->total_amount); // 140 + 70 + 50 - 20
        $this->assertSame(PaymentStatus::Unpaid, $order->payment_status);
    }

    public function test_partial_payment_and_voided_payment_are_reflected_in_the_balance(): void
    {
        $order = Order::factory()->create(['total_amount' => 300]);
        Payment::factory()->create(['order_id' => $order->id, 'amount' => 100, 'amount_tendered' => 100]);
        Payment::factory()->voided()->create(['order_id' => $order->id, 'amount' => 200, 'amount_tendered' => 200]);

        $order->refreshPaymentStatus();

        $this->assertSame('100.00', $order->amount_paid);
        $this->assertSame(200.0, $order->balance);
        $this->assertSame(PaymentStatus::Partial, $order->payment_status);
    }

    public function test_change_is_computed_from_cash_tendered(): void
    {
        $cash = Payment::factory()->create(['amount' => 245, 'amount_tendered' => 500]);
        $gcash = Payment::factory()->gcash()->create(['amount' => 245]);

        $this->assertSame(255.0, $cash->change);
        $this->assertSame(0.0, $gcash->change);
    }

    public function test_overdue_scope_only_includes_laundry_still_in_process(): void
    {
        $overdue = Order::factory()->overdue()->create();
        Order::factory()->create(['due_at' => now()->addDay()]);
        Order::factory()->status(OrderStatus::Ready)->create(['due_at' => now()->subDay()]);

        $this->assertSame([$overdue->id], Order::overdue()->pluck('id')->all());
        $this->assertTrue($overdue->isOverdue());
    }

    public function test_unclaimed_scope_uses_days_since_ready(): void
    {
        $unclaimed = Order::factory()->unclaimed(days: 10)->create();
        Order::factory()->unclaimed(days: 2)->create();

        $this->assertSame([$unclaimed->id], Order::unclaimed(7)->pluck('id')->all());
    }

    public function test_low_stock_scope(): void
    {
        $low = InventoryItem::factory()->lowStock()->create();
        InventoryItem::factory()->create(['quantity_on_hand' => 50, 'reorder_level' => 5]);

        $this->assertSame([$low->id], InventoryItem::lowStock()->pluck('id')->all());
    }

    public function test_settings_fall_back_to_defaults_and_can_be_changed(): void
    {
        $this->assertSame(50.0, Setting::float('express_surcharge_percent'));

        Setting::set('express_surcharge_percent', '40');

        $this->assertSame(40.0, Setting::float('express_surcharge_percent'));
    }
}
