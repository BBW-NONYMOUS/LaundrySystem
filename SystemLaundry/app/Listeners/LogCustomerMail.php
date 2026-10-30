<?php

namespace App\Listeners;

use App\Enums\NotificationChannel;
use App\Enums\NotificationStatus;
use App\Models\Customer;
use App\Models\NotificationLog;
use App\Notifications\CustomerOrderNotification;
use Illuminate\Notifications\Events\NotificationSent;

/**
 * Records customer emails in notification_logs (the SMS channel logs itself).
 */
class LogCustomerMail
{
    public function handle(NotificationSent $event): void
    {
        if ($event->channel !== 'mail'
            || ! $event->notification instanceof CustomerOrderNotification
            || ! $event->notifiable instanceof Customer) {
            return;
        }

        NotificationLog::query()->create([
            'order_id' => $event->notification->order->id,
            'customer_id' => $event->notifiable->id,
            'channel' => NotificationChannel::Mail,
            'type' => $event->notification->type(),
            'recipient' => (string) $event->notifiable->email,
            'message' => $event->notification->text($event->notifiable),
            'status' => NotificationStatus::Sent,
            'sent_at' => now(),
        ]);
    }
}
