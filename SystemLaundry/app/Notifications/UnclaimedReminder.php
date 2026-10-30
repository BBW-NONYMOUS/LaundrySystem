<?php

namespace App\Notifications;

use App\Models\Customer;
use App\Models\Setting;

class UnclaimedReminder extends CustomerOrderNotification
{
    public function type(): string
    {
        return 'unclaimed_reminder';
    }

    public function subject(): string
    {
        return 'Reminder: your laundry is waiting';
    }

    public function text(Customer $customer): string
    {
        $since = $this->order->ready_at?->format('M j') ?? 'a while';
        $balance = $this->order->balance > 0 ? " Balance due: {$this->money($this->order->balance)}." : '';

        return "Hi {$this->firstName($customer)}, order {$this->order->order_number} has been ready since {$since}. "
            .'Please claim it at '.Setting::get('shop_address', 'our shop').".{$balance}";
    }
}
