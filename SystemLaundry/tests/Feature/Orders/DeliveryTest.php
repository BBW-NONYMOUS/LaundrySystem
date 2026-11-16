<?php

namespace Tests\Feature\Orders;

use App\Enums\DeliveryStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Notifications\OrderOutForDelivery;
use App\Notifications\TripRescheduled;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class DeliveryTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
    }

    public function test_full_delivery_flow_with_cash_on_delivery(): void
    {
        $cashier = $this->cashier();
        $rider = $this->rider();
        $order = $this->orderWithItems(kilos: 4); // ₱140

        // Counter schedules the delivery and assigns the rider: +₱50 delivery fee.
        $this->actingAs($cashier)->post(route('orders.deliveries.store', $order), [
            'type' => 'delivery',
            'scheduled_at' => now()->addDay()->setTime(13, 0)->toDateTimeString(),
            'address' => '12 Mabini St.',
            'contact_phone' => '09181234567',
            'rider_id' => $rider->id,
        ])->assertSessionHasNoErrors();

        $order->refresh();
        $delivery = $order->delivery;
        $this->assertSame('190.00', $order->total_amount);

        // Rider can't leave before the laundry is ready.
        $this->actingAs($rider)->post(route('rider.deliveries.start', $delivery))->assertSessionHasErrors('delivery');

        $order->update(['status' => OrderStatus::Ready]);

        $this->actingAs($rider)->post(route('rider.deliveries.start', $delivery))->assertSessionHasNoErrors();
        $this->assertSame(OrderStatus::OutForDelivery, $order->refresh()->status);
        Notification::assertSentTo($order->customer, OrderOutForDelivery::class);

        // Completing without collecting the balance is refused and nothing is saved.
        $this->actingAs($rider)->post(route('rider.deliveries.complete', $delivery))->assertSessionHasErrors('status');
        $this->assertSame(OrderStatus::OutForDelivery, $order->refresh()->status);

        $this->actingAs($rider)->post(route('rider.deliveries.complete', $delivery), [
            'collected_amount' => 190,
            'payment_method' => 'cash',
            'amount_tendered' => 200,
        ])->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(OrderStatus::Delivered, $order->status);
        $this->assertSame(PaymentStatus::Paid, $order->payment_status);
        $this->assertSame(DeliveryStatus::Completed, $delivery->refresh()->status);
        $this->assertSame($rider->id, $order->payments()->sole()->received_by);
    }

    public function test_failed_delivery_returns_the_order_to_the_shelf(): void
    {
        $rider = $this->rider();
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);
        $delivery = $order->deliveries()->create([
            'type' => 'delivery', 'status' => 'scheduled', 'rider_id' => $rider->id,
            'scheduled_at' => now(), 'address' => 'x', 'contact_phone' => '09181234567',
        ]);

        $this->actingAs($rider)->post(route('rider.deliveries.start', $delivery))->assertSessionHasNoErrors();
        $this->actingAs($rider)->post(route('rider.deliveries.fail', $delivery), ['reason' => 'Nobody home'])->assertSessionHasNoErrors();

        $this->assertSame(OrderStatus::Ready, $order->refresh()->status);
        $delivery->refresh();
        $this->assertSame(DeliveryStatus::Failed, $delivery->status);
        $this->assertSame('Nobody home', $delivery->failure_reason);
        $this->assertSame(1, $delivery->attempts);

        // The counter reschedules it, saying why.
        $this->actingAs($this->cashier())->put(route('deliveries.update', $delivery), [
            'scheduled_at' => now()->addDay()->setTime(9, 0)->toDateTimeString(),
            'reschedule_reason' => 'Nobody was home',
        ])->assertSessionHasNoErrors();
        $this->assertSame(DeliveryStatus::Scheduled, $delivery->refresh()->status);
        $this->assertSame('Nobody was home', $delivery->reschedule_reason);
    }

    public function test_moving_a_trip_needs_a_reason_and_tells_the_customer(): void
    {
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);
        $tomorrow = now()->addDay()->setTime(9, 0);
        $delivery = $order->deliveries()->create([
            'type' => 'delivery', 'status' => 'scheduled',
            'scheduled_at' => $tomorrow, 'address' => 'x', 'contact_phone' => '09181234567',
        ]);
        $cashier = $this->cashier();

        // Same time, new address: not a reschedule.
        $this->actingAs($cashier)->put(route('deliveries.update', $delivery), [
            'scheduled_at' => $tomorrow->toDateTimeString(),
            'address' => '12 Mabini St.',
        ])->assertSessionHasNoErrors();
        $this->assertNull($delivery->refresh()->reschedule_reason);
        Notification::assertNothingSent();

        // Stray seconds on an older time (seeded data) aren't a move either.
        $delivery->update(['scheduled_at' => $tomorrow->setTime(9, 0, 37)]);
        $this->actingAs($cashier)->put(route('deliveries.update', $delivery), [
            'scheduled_at' => $tomorrow->toDateTimeString(),
            'address' => '14 Mabini St.',
        ])->assertSessionHasNoErrors();
        Notification::assertNothingSent();

        // Another time without a reason is refused and nothing changes.
        $this->actingAs($cashier)->put(route('deliveries.update', $delivery), [
            'scheduled_at' => $tomorrow->setTime(13, 0)->toDateTimeString(),
        ])->assertSessionHasErrors('reschedule_reason');
        $this->assertTrue($delivery->refresh()->scheduled_at->equalTo($tomorrow));

        // The order page's trip dialog follows the same rule.
        $this->actingAs($cashier)->post(route('orders.deliveries.store', $order), [
            'type' => 'delivery',
            'scheduled_at' => $tomorrow->setTime(16, 0)->toDateTimeString(),
            'address' => '12 Mabini St.',
            'contact_phone' => '09181234567',
            'reschedule_reason' => 'Rider unavailable',
        ])->assertSessionHasNoErrors();

        $delivery->refresh();
        $this->assertSame('Rider unavailable', $delivery->reschedule_reason);
        $this->assertNotNull($delivery->rescheduled_at);
        Notification::assertSentTo(
            $order->customer,
            TripRescheduled::class,
            fn (TripRescheduled $notification) => str_contains($notification->text($order->customer), 'Reason: Rider unavailable.')
                && str_contains($notification->text($order->customer), '4:00 PM'),
        );
    }

    public function test_riders_only_see_and_act_on_their_own_trips(): void
    {
        $mine = $this->rider();
        $other = $this->rider();
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);
        $delivery = $order->deliveries()->create([
            'type' => 'delivery', 'status' => 'scheduled', 'rider_id' => $other->id,
            'scheduled_at' => now(), 'address' => 'x', 'contact_phone' => '09181234567',
        ]);

        $this->actingAs($mine)->post(route('rider.deliveries.start', $delivery))->assertForbidden();

        $this->assertPage(
            $this->actingAs($mine)->get(route('rider.deliveries.index')),
            'rider/deliveries',
            fn ($page) => $page->has('pending', 0),
        );

        // Riders can't open the counter's scheduling board.
        $this->actingAs($mine)->get(route('deliveries.index'))->assertForbidden();
    }

    public function test_only_riders_can_be_assigned(): void
    {
        $order = $this->orderWithItems();

        $this->actingAs($this->cashier())->post(route('orders.deliveries.store', $order), [
            'type' => 'delivery',
            'scheduled_at' => now()->addDay()->toDateTimeString(),
            'address' => '12 Mabini St.',
            'contact_phone' => '09181234567',
            'rider_id' => $this->staff()->id,
        ])->assertSessionHasErrors('rider_id');
    }
}
