<?php

namespace App\Notifications;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;

/**
 * A pickup or delivery was moved to another date/time; tells the customer when and why.
 */
class TripRescheduled extends CustomerOrderNotification
{
    public function __construct(Order $order, public Delivery $delivery)
    {
        parent::__construct($order);
    }

    public function type(): string
    {
        return 'trip_rescheduled';
    }

    public function subject(): string
    {
        return "Your {$this->tripName()} was rescheduled";
    }

    public function text(Customer $customer): string
    {
        $reason = rtrim((string) $this->delivery->reschedule_reason, '.');

        return "Hi {$this->firstName($customer)}, the {$this->tripName()} for order {$this->order->order_number} "
            ."was moved to {$this->delivery->scheduled_at->format('M j, g:i A')}. Reason: {$reason}.";
    }

    private function tripName(): string
    {
        return strtolower($this->delivery->type->label());
    }
}
