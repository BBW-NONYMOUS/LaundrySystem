<?php

namespace App\Notifications;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Setting;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\Contracts\SendsSms;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Base for every message sent to a customer about an order. Sent by SMS and/or email
 * depending on the shop settings, queued so the counter never waits for the SMS provider,
 * and only after the database transaction commits.
 */
abstract class CustomerOrderNotification extends Notification implements SendsSms, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> Seconds to wait between retries if the SMS/mail provider is down. */
    public array $backoff = [60, 300];

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

    /**
     * Short machine name stored in notification_logs.type, e.g. "order_ready".
     */
    abstract public function type(): string;

    abstract public function subject(): string;

    /**
     * The message body. Kept short so it fits in one or two SMS segments.
     */
    abstract public function text(Customer $customer): string;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];

        if (Setting::bool('sms_enabled') && $notifiable instanceof Customer && filled($notifiable->phone)) {
            $channels[] = SmsChannel::class;
        }

        if (Setting::bool('email_enabled') && $notifiable instanceof Customer && filled($notifiable->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toSms(object $notifiable): string
    {
        if (! $notifiable instanceof Customer) {
            throw new InvalidArgumentException('Order notifications are sent to customers.');
        }

        return $this->shopName().': '.$this->text($notifiable);
    }

    /**
     * @return array{order_id: int, customer_id: int|null}
     */
    public function logContext(object $notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'customer_id' => $notifiable instanceof Customer ? $notifiable->id : null,
        ];
    }

    public function toMail(Customer $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject().' — '.$this->order->order_number)
            ->greeting('Hi '.$this->firstName($notifiable).',')
            ->line($this->text($notifiable))
            ->action('Track your order', $this->trackingUrl())
            ->salutation('Thank you, '.$this->shopName());
    }

    protected function shopName(): string
    {
        return Setting::get('shop_name', config()->string('app.name')) ?? config()->string('app.name');
    }

    protected function trackingUrl(): string
    {
        return route('tracking.show', $this->order->tracking_code);
    }

    protected function money(float|string $amount): string
    {
        return Setting::get('currency_symbol', '₱').number_format((float) $amount, 2);
    }

    protected function firstName(Customer $customer): string
    {
        return Str::before($customer->name, ' ');
    }
}
