<?php

namespace Tests\Unit;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use PHPUnit\Framework\TestCase;

class OrderStatusTest extends TestCase
{
    public function test_normal_flow_moves_forward_one_step_at_a_time(): void
    {
        $this->assertTrue(OrderStatus::Received->canTransitionTo(OrderStatus::Washing));
        $this->assertTrue(OrderStatus::Washing->canTransitionTo(OrderStatus::Drying));
        $this->assertTrue(OrderStatus::Drying->canTransitionTo(OrderStatus::Folding));
        $this->assertTrue(OrderStatus::Folding->canTransitionTo(OrderStatus::Ready));
        $this->assertTrue(OrderStatus::Ready->canTransitionTo(OrderStatus::Completed));
    }

    public function test_orders_cannot_move_backwards_or_skip_into_processing(): void
    {
        $this->assertFalse(OrderStatus::Drying->canTransitionTo(OrderStatus::Washing));
        $this->assertFalse(OrderStatus::Received->canTransitionTo(OrderStatus::Folding));
        $this->assertFalse(OrderStatus::Washing->canTransitionTo(OrderStatus::Completed));
    }

    public function test_cancellation_is_only_allowed_before_washing(): void
    {
        $this->assertTrue(OrderStatus::Pending->canTransitionTo(OrderStatus::Cancelled));
        $this->assertTrue(OrderStatus::Received->canTransitionTo(OrderStatus::Cancelled));
        $this->assertFalse(OrderStatus::Washing->canTransitionTo(OrderStatus::Cancelled));
        $this->assertFalse(OrderStatus::Ready->canTransitionTo(OrderStatus::Cancelled));
    }

    public function test_failed_delivery_returns_the_order_to_ready(): void
    {
        $this->assertTrue(OrderStatus::OutForDelivery->canTransitionTo(OrderStatus::Ready));
        $this->assertTrue(OrderStatus::OutForDelivery->canTransitionTo(OrderStatus::Delivered));
    }

    public function test_final_statuses_have_no_next_step(): void
    {
        foreach ([OrderStatus::Completed, OrderStatus::Delivered, OrderStatus::Cancelled] as $status) {
            $this->assertTrue($status->isFinal());
            $this->assertSame([], $status->allowedTransitions());
        }
    }

    public function test_every_status_has_a_label_and_badge_color(): void
    {
        foreach (OrderStatus::options() as $option) {
            $this->assertNotSame('', $option['label']);
            $this->assertNotSame('', $option['color']);
        }
    }

    public function test_payment_status_is_derived_from_amounts(): void
    {
        $this->assertSame(PaymentStatus::Unpaid, PaymentStatus::fromAmounts(300, 0));
        $this->assertSame(PaymentStatus::Partial, PaymentStatus::fromAmounts(300, 150));
        $this->assertSame(PaymentStatus::Paid, PaymentStatus::fromAmounts(300, 300));
    }
}
