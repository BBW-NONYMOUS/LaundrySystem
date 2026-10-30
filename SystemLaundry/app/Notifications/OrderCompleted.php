<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Customer;

class OrderCompleted extends CustomerOrderNotification
{
    public function type(): string
    {
        return 'order_completed';
    }

    public function subject(): string
    {
        return 'Thank you for your order';
    }

    public function text(Customer $customer): string
    {
        $how = $this->order->status === OrderStatus::Delivered ? 'delivered' : 'claimed';

        // The rating link feeds the website testimonials (approved by the owner first).
        return "Order {$this->order->order_number} has been {$how}. Thank you, {$this->firstName($customer)}! "
            .'How did we do? Rate us: '.route('public.feedback', $this->order->tracking_code);
    }
}
