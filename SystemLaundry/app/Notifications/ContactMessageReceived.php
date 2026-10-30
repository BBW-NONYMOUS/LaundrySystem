<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Email receipt to someone who used the Contact form (only when they gave an email).
 */
class ContactMessageReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ContactMessage $contactMessage)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return Setting::bool('email_enabled') ? ['mail'] : [];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $shop = Setting::get('shop_name', config()->string('app.name'));

        return (new MailMessage)
            ->subject("We got your message — {$shop}")
            ->greeting('Hi '.Str::before($this->contactMessage->name, ' ').',')
            ->line('Thanks for reaching out. We usually reply within one business day.')
            ->line('Your message: “'.Str::limit($this->contactMessage->message, 300).'”')
            ->line('Need us sooner? Call '.Setting::get('shop_phone', '').' during '.Setting::get('business_hours', 'business hours').'.')
            ->salutation("Thank you, {$shop}");
    }
}
