<?php

namespace App\Notifications;

use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the owner a supply dropped to/below its reorder level (in-app bell + email).
 */
class LowStockAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public InventoryItem $item)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(User $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Low stock: {$this->item->name}")
            ->line($this->message())
            ->action('Open inventory', route('inventory.show', $this->item));
    }

    /**
     * @return array{title: string, message: string, url: string, level: string}
     */
    public function toArray(User $notifiable): array
    {
        return [
            'title' => 'Low stock',
            'message' => $this->message(),
            'url' => route('inventory.show', $this->item, absolute: false),
            'level' => 'warning',
        ];
    }

    private function message(): string
    {
        return "{$this->item->name} is down to {$this->item->quantity_on_hand} {$this->item->unit} "
            ."(reorder level {$this->item->reorder_level}).";
    }
}
