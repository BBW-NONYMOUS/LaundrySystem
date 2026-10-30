<?php

namespace App\Notifications;

use App\Models\Setting;

class BookingDeclined extends GuestBookingNotification
{
    public function type(): string
    {
        return 'booking_declined';
    }

    public function subject(): string
    {
        return 'About your pickup request';
    }

    public function text(): string
    {
        $reason = $this->booking->decline_reason ? " {$this->booking->decline_reason}" : '';

        return "Sorry {$this->firstName()}, we can't do pickup {$this->booking->reference}.{$reason} "
            .'Questions? Call '.Setting::get('shop_phone', '').'.';
    }
}
