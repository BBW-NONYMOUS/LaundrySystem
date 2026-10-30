<?php

namespace App\Notifications;

use App\Models\Customer;

class OrderReceived extends CustomerOrderNotification
{
    public function type(): string
    {
        return 'order_received';
    }

    public function subject(): string
    {
        return 'We received your laundry';
    }

    public function text(Customer $customer): string
    {
        $due = $this->order->due_at?->format('M j, g:i A') ?? 'soon';

        return "Hi {$this->firstName($customer)}, we received your laundry. Order {$this->order->order_number}, "
            ."total {$this->money($this->order->total_amount)}, ready by {$due}. Track: {$this->trackingUrl()}";
    }
}
