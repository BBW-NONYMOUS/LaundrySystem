<?php

namespace Tests\Feature\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\OrderCompleted;
use App\Notifications\OrderReady;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class OrderStatusTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
    }

    public function test_staff_move_laundry_through_processing_and_each_step_is_recorded(): void
    {
        $staff = $this->staff();
        $order = $this->orderWithItems();

        foreach ([OrderStatus::Washing, OrderStatus::Drying, OrderStatus::Folding, OrderStatus::Ready] as $status) {
            $this->actingAs($staff)->post(route('orders.status.update', $order), ['status' => $status->value])
                ->assertSessionHasNoErrors();
        }

        $order->refresh();
        $this->assertSame(OrderStatus::Ready, $order->status);
        $this->assertNotNull($order->ready_at);
        $this->assertSame(4, $order->statusHistories()->where('changed_by', $staff->id)->count());
        Notification::assertSentTo($order->customer, OrderReady::class);
    }

    public function test_skipping_or_going_backwards_is_rejected(): void
    {
        $order = $this->orderWithItems();

        $this->actingAs($this->staff())->post(route('orders.status.update', $order), ['status' => OrderStatus::Folding->value])
            ->assertSessionHasErrors('status');

        $this->assertSame(OrderStatus::Received, $order->refresh()->status);
    }

    public function test_laundry_with_a_balance_cannot_be_released(): void
    {
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);

        $this->actingAs($this->cashier())->post(route('orders.status.update', $order), ['status' => OrderStatus::Completed->value])
            ->assertSessionHasErrors('status');

        $this->assertSame(OrderStatus::Ready, $order->refresh()->status);
    }

    public function test_paid_laundry_is_released_and_the_customer_is_thanked(): void
    {
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);
        Payment::factory()->create(['order_id' => $order->id, 'amount' => $order->total_amount, 'amount_tendered' => $order->total_amount]);
        $order->refreshPaymentStatus();

        $this->actingAs($this->cashier())->post(route('orders.status.update', $order), ['status' => OrderStatus::Completed->value])
            ->assertSessionHasNoErrors();

        $this->assertSame(OrderStatus::Completed, $order->refresh()->status);
        $this->assertNotNull($order->completed_at);
        Notification::assertSentTo($order->customer, OrderCompleted::class);
    }

    public function test_owner_can_override_the_balance_rule_with_a_reason(): void
    {
        $admin = $this->admin();
        $order = $this->orderWithItems(['status' => OrderStatus::Ready]);

        $this->actingAs($admin)->post(route('orders.status.update', $order), ['status' => OrderStatus::Completed->value])
            ->assertSessionHasErrors('status');

        $this->actingAs($admin)->post(route('orders.status.update', $order), [
            'status' => OrderStatus::Completed->value,
            'notes' => 'Regular customer, will pay Saturday',
        ])->assertSessionHasNoErrors();

        $this->assertSame(OrderStatus::Completed, $order->refresh()->status);
    }

    public function test_cancelling_needs_a_reason_and_no_payments(): void
    {
        $cashier = $this->cashier();
        $order = $this->orderWithItems();

        $this->actingAs($cashier)->post(route('orders.status.update', $order), ['status' => OrderStatus::Cancelled->value])
            ->assertSessionHasErrors('notes');

        Payment::factory()->create(['order_id' => $order->id, 'amount' => 50, 'amount_tendered' => 50]);
        $order->refreshPaymentStatus();

        $this->actingAs($cashier)->post(route('orders.status.update', $order), ['status' => OrderStatus::Cancelled->value, 'notes' => 'Changed mind'])
            ->assertSessionHasErrors('status');

        $order->payments()->update(['voided_at' => now()]);
        $order->refreshPaymentStatus();

        $this->actingAs($cashier)->post(route('orders.status.update', $order), ['status' => OrderStatus::Cancelled->value, 'notes' => 'Changed mind'])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(OrderStatus::Cancelled, $order->status);
        $this->assertSame('Changed mind', $order->cancellation_reason);
    }

    public function test_laundry_staff_cannot_cancel(): void
    {
        $order = $this->orderWithItems();

        $this->actingAs($this->staff())->post(route('orders.status.update', $order), ['status' => OrderStatus::Cancelled->value, 'notes' => 'x'])
            ->assertForbidden();
    }

    public function test_a_booked_pickup_must_be_weighed_before_it_is_received(): void
    {
        $cashier = $this->cashier();
        $order = Order::factory()->pendingPickup()->create();

        $this->actingAs($cashier)->post(route('orders.status.update', $order), ['status' => OrderStatus::Received->value])
            ->assertSessionHasErrors('status');

        $service = $this->washDryFold();
        $this->actingAs($cashier)->put(route('orders.update', $order), ['items' => [['service_id' => $service->id, 'quantity' => 4]]])
            ->assertSessionHasNoErrors();

        $this->actingAs($cashier)->post(route('orders.status.update', $order), ['status' => OrderStatus::Received->value])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(OrderStatus::Received, $order->status);
        $this->assertNotNull($order->received_at);
        $this->assertTrue($order->due_at->equalTo($order->received_at->addHours(24)));
    }

    public function test_scanning_a_tag_opens_the_order_with_its_next_steps(): void
    {
        $staff = $this->staff();
        $order = $this->orderWithItems();

        $this->actingAs($staff)->get(route('scan.index', ['code' => url("/scan/{$order->order_number}")]))
            ->assertRedirect(route('scan.show', $order->order_number));

        $this->assertPage(
            $this->actingAs($staff)->get(route('scan.show', $order->order_number)),
            'scan/show',
            fn ($page) => $page->where('order.order_number', $order->order_number)
                ->where('nextStatuses.0.value', OrderStatus::Washing->value)
                ->where('nextStatuses', fn ($statuses) => collect($statuses)->pluck('value')->doesntContain('cancelled')),
        );
    }

    public function test_two_rapid_scans_cannot_skip_a_step(): void
    {
        $staff = $this->staff();
        $order = $this->orderWithItems();

        $this->actingAs($staff)->post(route('orders.status.update', $order), ['status' => 'washing'])->assertSessionHasNoErrors();
        // A second tap with the same target is now an invalid "washing -> washing" move.
        $this->actingAs($staff)->post(route('orders.status.update', $order), ['status' => 'washing'])->assertSessionHasErrors('status');

        $this->assertSame(1, $order->statusHistories()->where('to_status', 'washing')->count());
    }
}
