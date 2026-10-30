<?php

namespace App\Notifications\Contracts;

/**
 * A notification that can be sent by SMS through App\Notifications\Channels\SmsChannel.
 */
interface SendsSms
{
    /**
     * The SMS text for this recipient.
     */
    public function toSms(object $notifiable): string;

    /**
     * Short machine name stored in notification_logs.type, e.g. "booking_received".
     */
    public function type(): string;

    /**
     * Records the message is about, for notification_logs.
     *
     * @return array{order_id?: int|null, customer_id?: int|null}
     */
    public function logContext(object $notifiable): array;
}
