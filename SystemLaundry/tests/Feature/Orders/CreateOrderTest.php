<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\PricingUnit;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Service;
use App\Notifications\OrderReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class CreateOrderTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
    }

    public function test_cashier_creates_a_walk_in_order_with_a_new_customer_and_cash_payment(): void
    {
        $this->travelTo(now()->setTime(9, 30));
        $service = $this->washDryFold();

        $response = $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer' => ['name' => 'maria  santos', 'phone' => '+63 917 555 0101'],
            'items' => [['service_id' => $service->id, 'quantity' => 5.2, 'piece_count' => 24]],
            'special_instructions' => 'Separate whites',
            'payment' => ['method' => 'cash', 'amount' => 182, 'amount_tendered' => 200],
            // Totals sent by the browser must be ignored.
            'total_amount' => 1,
        ]);

        $order = Order::query()->with(['items', 'payments', 'statusHistories'])->sole();

        $response->assertRedirect(route('orders.show', $order));
        $this->assertSame('LND-'.now()->format('Ymd').'-0001', $order->order_number);
        $this->assertSame(12, strlen($order->tracking_code));
        $this->assertSame(OrderStatus::Received, $order->status);
        $this->assertSame('182.00', $order->total_amount); // 5.2 kg × ₱35
        $this->assertSame(PaymentStatus::Paid, $order->payment_status);
        $this->assertSame(18.0, $order->payments->first()->change);
        $this->assertSame(24, $order->items->first()->piece_count);
        $this->assertTrue($order->due_at->equalTo(now()->addHours(24)));
        $this->assertCount(1, $order->statusHistories);

        $customer = Customer::query()->sole();
        $this->assertSame('Maria Santos', $customer->name);
        $this->assertSame('09175550101', $customer->phone);
        Notification::assertSentTo($customer, OrderReceived::class);
    }

    public function test_quick_add_with_an_existing_phone_reuses_the_customer(): void
    {
        $existing = Customer::factory()->create(['phone' => '09175550101']);

        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer' => ['name' => 'Maria Santos', 'phone' => '0917-555-0101'],
            'items' => [['service_id' => $this->washDryFold()->id, 'quantity' => 3]],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Customer::query()->count());
        $this->assertTrue(Order::query()->sole()->customer->is($existing));
    }

    public function test_order_numbers_are_sequential_within_the_day(): void
    {
        $cashier = $this->cashier();
        $customer = Customer::factory()->create();
        $service = $this->washDryFold();

        foreach (range(1, 3) as $ignored) {
            $this->actingAs($cashier)->post(route('orders.store'), [
                'customer_id' => $customer->id,
                'items' => [['service_id' => $service->id, 'quantity' => 3]],
            ])->assertSessionHasNoErrors();
        }

        $this->assertSame(
            ['0001', '0002', '0003'],
            Order::query()->orderBy('id')->pluck('order_number')->map(fn (string $number) => substr($number, -4))->all(),
        );
    }

    public function test_minimum_kilos_express_surcharge_and_discount_are_applied(): void
    {
        $service = $this->washDryFold();

        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer_id' => Customer::factory()->create()->id,
            'items' => [['service_id' => $service->id, 'quantity' => 2]], // billed as 3 kg = 105
            'is_express' => true,                                         // +50% = 52.50
            'discount_amount' => 20,
            'discount_reason' => 'Senior Citizen',
        ])->assertSessionHasNoErrors();

        $order = Order::query()->sole();
        $this->assertSame('105.00', $order->subtotal);
        $this->assertSame('52.50', $order->express_fee);
        $this->assertSame('137.50', $order->total_amount);
        $this->assertTrue($order->due_at->equalTo($order->received_at->addHours(8)));
    }

    public function test_express_is_refused_when_a_service_does_not_offer_it(): void
    {
        $shoes = Service::factory()->create(['pricing_unit' => PricingUnit::PerItem, 'express_turnaround_hours' => null]);

        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer_id' => Customer::factory()->create()->id,
            'items' => [['service_id' => $shoes->id, 'quantity' => 1]],
            'is_express' => true,
        ])->assertSessionHasErrors('is_express');

        $this->assertSame(0, Order::query()->count());
    }

    public function test_validation_rejects_missing_items_unknown_services_and_discount_without_reason(): void
    {
        $customer = Customer::factory()->create();
        $inactive = Service::factory()->inactive()->create();

        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer_id' => $customer->id,
            'items' => [['service_id' => $inactive->id, 'quantity' => 0]],
            'discount_amount' => 10,
        ])->assertSessionHasErrors(['items.0.service_id', 'items.0.quantity', 'discount_reason']);

        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer_id' => $customer->id,
        ])->assertSessionHasErrors('items');
    }

    public function test_booked_pickup_starts_as_pending_without_items(): void
    {
        $this->actingAs($this->cashier())->post(route('orders.store'), [
            'customer_id' => Customer::factory()->create()->id,
            'pickup' => ['scheduled_at' => now()->addDay()->setTime(9, 0)->toDateTimeString(), 'address' => 'Blk 1 Lot 2, Poblacion'],
        ])->assertSessionHasNoErrors();

        $order = Order::query()->with('pickup')->sole();
        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertNull($order->received_at);
        $this->assertSame('50.00', $order->delivery_fee);
        $this->assertNotNull($order->pickup);
        Notification::assertNothingSent();
    }

    public function test_laundry_staff_cannot_create_orders(): void
    {
        $this->actingAs($this->staff())->get(route('orders.create'))->assertForbidden();

        $this->actingAs($this->staff())->post(route('orders.store'), [
            'customer_id' => Customer::factory()->create()->id,
            'items' => [['service_id' => $this->washDryFold()->id, 'quantity' => 3]],
        ])->assertForbidden();
    }

    public function test_items_can_be_edited_before_washing_but_not_after(): void
    {
        $cashier = $this->cashier();
        $order = $this->orderWithItems(kilos: 4);
        $service = $order->items->first()->service;

        $this->actingAs($cashier)->put(route('orders.update', $order), [
            'items' => [['service_id' => $service->id, 'quantity' => 6]],
        ])->assertSessionHasNoErrors();

        $this->assertSame('210.00', $order->refresh()->total_amount);

        $order->update(['status' => OrderStatus::Washing]);

        $this->actingAs($cashier)->put(route('orders.update', $order), [
            'items' => [['service_id' => $service->id, 'quantity' => 2]],
        ])->assertForbidden();
    }
}
