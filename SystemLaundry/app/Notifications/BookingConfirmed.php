<?php

namespace App\Notifications;

class BookingConfirmed extends GuestBookingNotification
{
    public function type(): string
    {
        return 'booking_confirmed';
    }

    public function subject(): string
    {
        return 'Your pickup is confirmed';
    }

    public function text(): string
    {
        $order = $this->booking->order;
        $tracking = $order !== null
            ? " Order {$order->order_number}. Track: ".route('tracking.show', $order->tracking_code)
            : '';

        return "Confirmed! Our rider will pick up your laundry on {$this->when()}.{$tracking}";
    }
}
