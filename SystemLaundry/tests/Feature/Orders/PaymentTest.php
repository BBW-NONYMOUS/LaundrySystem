<?php

namespace Tests\Feature\Orders;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
    }

    public function test_partial_then_full_payment_with_change(): void
    {
        $cashier = $this->cashier();
        $order = $this->orderWithItems(kilos: 6); // ₱210

        $this->actingAs($cashier)->post(route('orders.payments.store', $order), ['method' => 'cash', 'amount' => 100, 'amount_tendered' => 100])
            ->assertSessionHasNoErrors();
        $this->assertSame(PaymentStatus::Partial, $order->refresh()->payment_status);
        $this->assertSame(110.0, $order->balance);

        $this->actingAs($cashier)->post(route('orders.payments.store', $order), ['method' => 'cash', 'amount' => 110, 'amount_tendered' => 500])
            ->assertSessionHasNoErrors();

        $order->refresh();
        $this->assertSame(PaymentStatus::Paid, $order->payment_status);
        $this->assertSame(390.0, $order->payments()->latest('id')->first()->change);
    }

    public function test_overpayment_and_short_cash_are_rejected(): void
    {
        $cashier = $this->cashier();
        $order = $this->orderWithItems(kilos: 4); // ₱140

        $this->actingAs($cashier)->post(route('orders.payments.store', $order), ['method' => 'cash', 'amount' => 200, 'amount_tendered' => 200])
            ->assertSessionHasErrors('amount');

        $this->actingAs($cashier)->post(route('orders.payments.store', $order), ['method' => 'cash', 'amount' => 140, 'amount_tendered' => 100])
            ->assertSessionHasErrors('amount_tendered');

        $this->assertSame(0, Payment::query()->count());
    }

    public function test_e_wallet_payments_need_a_reference_number(): void
    {
        $order = $this->orderWithItems();

        $this->actingAs($this->cashier())->post(route('orders.payments.store', $order), ['method' => 'gcash', 'amount' => 50])
            ->assertSessionHasErrors('reference_number');

        $this->actingAs($this->cashier())->post(route('orders.payments.store', $order), ['method' => 'gcash', 'amount' => 50, 'reference_number' => '1009 234 5678'])
            ->assertSessionHasNoErrors();

        $this->assertNull(Payment::query()->sole()->amount_tendered);
    }

    public function test_only_the_owner_can_void_and_voiding_restores_the_balance(): void
    {
        $order = $this->orderWithItems(kilos: 4);
        $payment = Payment::factory()->create(['order_id' => $order->id, 'amount' => 140, 'amount_tendered' => 140]);
        $order->refreshPaymentStatus();

        $this->actingAs($this->cashier())->post(route('payments.void', $payment), ['reason' => 'Typo'])->assertForbidden();

        $this->actingAs($this->admin())->post(route('payments.void', $payment), ['reason' => 'Wrong order'])
            ->assertSessionHasNoErrors();

        $this->assertTrue($payment->refresh()->isVoided());
        $this->assertSame(PaymentStatus::Unpaid, $order->refresh()->payment_status);
        $this->assertSame(140.0, $order->balance);
    }

    public function test_payment_history_lists_and_filters_payments(): void
    {
        $order = $this->orderWithItems();
        Payment::factory()->create(['order_id' => $order->id, 'amount' => 50, 'amount_tendered' => 50]);
        Payment::factory()->gcash()->create(['order_id' => $order->id, 'amount' => 20]);

        $this->assertPage(
            $this->actingAs($this->cashier())->get(route('payments.index', ['method' => 'gcash'])),
            'payments/index',
            fn ($page) => $page->has('payments.data', 1)->where('payments.data.0.method', 'gcash')->where('totalCollected', 20),
        );
    }
}
