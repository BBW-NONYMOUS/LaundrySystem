<?php

namespace App\Notifications;

use App\Models\Customer;

class OrderReady extends CustomerOrderNotification
{
    public function type(): string
    {
        return 'order_ready';
    }

    public function subject(): string
    {
        return 'Your laundry is ready';
    }

    public function text(Customer $customer): string
    {
        $delivery = $this->order->delivery;

        if ($delivery !== null) {
            return "Good news {$this->firstName($customer)}! Order {$this->order->order_number} is ready and will be "
                ."delivered on {$delivery->scheduled_at->format('M j, g:i A')}.".$this->balanceNote();
        }

        return "Good news {$this->firstName($customer)}! Order {$this->order->order_number} is ready for pickup."
            .$this->balanceNote();
    }

    private function balanceNote(): string
    {
        return $this->order->balance > 0 ? " Balance due: {$this->money($this->order->balance)}." : '';
    }
}
