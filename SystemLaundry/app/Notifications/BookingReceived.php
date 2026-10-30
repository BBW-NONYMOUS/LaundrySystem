<?php

namespace App\Notifications;

class BookingReceived extends GuestBookingNotification
{
    public function type(): string
    {
        return 'booking_received';
    }

    public function subject(): string
    {
        return 'We received your pickup request';
    }

    public function text(): string
    {
        return "Hi {$this->firstName()}, we got your pickup request {$this->booking->reference} for {$this->when()}. "
            ."We'll text you once it's confirmed.";
    }
}
