<?php

namespace App\Notifications;

use App\Models\BookingRequest;
use App\Models\Setting;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\Contracts\SendsSms;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Base for messages about a website booking request. The guest may not be a customer yet,
 * so these are sent on demand to the phone/email on the request (BookingService::notifyGuest).
 */
abstract class GuestBookingNotification extends Notification implements SendsSms, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public BookingRequest $booking)
    {
        $this->afterCommit();
    }

    abstract public function type(): string;

    abstract public function subject(): string;

    abstract public function text(): string;

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];

        if (Setting::bool('sms_enabled')) {
            $channels[] = SmsChannel::class;
        }

        if (Setting::bool('email_enabled') && filled($this->booking->email)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    public function toSms(object $notifiable): string
    {
        return $this->shopName().': '.$this->text();
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject().' — '.$this->booking->reference)
            ->greeting('Hi '.Str::before($this->booking->name, ' ').',')
            ->line($this->text())
            ->salutation('Thank you, '.$this->shopName());
    }

    /**
     * @return array{order_id: int|null, customer_id: int|null}
     */
    public function logContext(object $notifiable): array
    {
        return ['order_id' => $this->booking->order_id, 'customer_id' => $this->booking->customer_id];
    }

    /** "Fri, Oct 24, 9:00 – 11:00 AM" */
    protected function when(): string
    {
        return $this->booking->pickup_date->format('D, M j').', '.$this->booking->time_slot->window();
    }

    protected function shopName(): string
    {
        return Setting::get('shop_name', config()->string('app.name')) ?? config()->string('app.name');
    }

    protected function firstName(): string
    {
        return Str::before($this->booking->name, ' ');
    }
}
