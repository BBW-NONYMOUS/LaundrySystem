<?php

namespace App\Notifications\Channels;

use App\Enums\NotificationChannel;
use App\Enums\NotificationStatus;
use App\Models\Customer;
use App\Models\NotificationLog;
use App\Notifications\Contracts\SendsSms;
use App\Services\Sms\SmsException;
use App\Services\Sms\SmsGateway;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Notifications\Notification;

/**
 * Sends a notification's toSms() text through the configured gateway and records the
 * outcome in notification_logs (sent or failed) so staff can see what customers received.
 *
 * Recipients: a Customer (their phone), or an on-demand route for guests who aren't
 * customers yet: Notification::route(SmsChannel::class, '09171234567').
 */
class SmsChannel
{
    public function __construct(private SmsGateway $gateway) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $notification instanceof SendsSms) {
            return;
        }

        $to = match (true) {
            $notifiable instanceof Customer => $notifiable->phone,
            $notifiable instanceof AnonymousNotifiable => (string) $notifiable->routeNotificationFor(self::class),
            default => '',
        };

        if ($to === '') {
            return;
        }

        $message = $notification->toSms($notifiable);
        $context = $notification->logContext($notifiable);

        $log = NotificationLog::query()->create([
            'order_id' => $context['order_id'] ?? null,
            'customer_id' => $context['customer_id'] ?? null,
            'channel' => NotificationChannel::Sms,
            'type' => $notification->type(),
            'recipient' => $to,
            'message' => $message,
            'status' => NotificationStatus::Queued,
        ]);

        try {
            $this->gateway->send($to, $message);
        } catch (SmsException $e) {
            $log->update(['status' => NotificationStatus::Failed, 'error' => $e->getMessage()]);

            // Rethrow so the queued job is retried.
            throw $e;
        }

        $log->update(['status' => NotificationStatus::Sent, 'sent_at' => now()]);
    }
}
