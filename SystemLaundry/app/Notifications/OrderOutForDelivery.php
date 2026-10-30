<?php

namespace App\Notifications;

use App\Models\Customer;

class OrderOutForDelivery extends CustomerOrderNotification
{
    public function type(): string
    {
        return 'order_out_for_delivery';
    }

    public function subject(): string
    {
        return 'Your laundry is on the way';
    }

    public function text(Customer $customer): string
    {
        $rider = $this->order->delivery?->rider;
        $riderNote = $rider !== null ? " with {$rider->name}".($rider->phone ? " ({$rider->phone})" : '') : '';
        $cod = $this->order->balance > 0 ? " Please prepare {$this->money($this->order->balance)}." : '';

        return "Order {$this->order->order_number} is on the way{$riderNote}.{$cod}";
    }
}
