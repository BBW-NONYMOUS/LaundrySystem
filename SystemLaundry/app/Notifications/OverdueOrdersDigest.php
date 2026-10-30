<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Morning in-app alert for the counter and owner: laundry that is past its due time.
 */
class OverdueOrdersDigest extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<int, string>  $orderNumbers
     */
    public function __construct(public int $count, public array $orderNumbers) {}

    /**
     * @return list<string>
     */
    public function via(User $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array{title: string, message: string, url: string, level: string}
     */
    public function toArray(User $notifiable): array
    {
        $preview = implode(', ', array_slice($this->orderNumbers, 0, 5));
        $more = $this->count > 5 ? ' and '.($this->count - 5).' more' : '';

        return [
            'title' => "{$this->count} overdue ".($this->count === 1 ? 'order' : 'orders'),
            'message' => "Past due and still in process: {$preview}{$more}.",
            'url' => route('monitoring.overdue', absolute: false),
            'level' => 'destructive',
        ];
    }
}
