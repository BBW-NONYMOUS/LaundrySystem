<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Setting;
use App\Notifications\UnclaimedReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

/**
 * Reminds customers whose laundry has been ready for X days (setting: unclaimed_after_days),
 * then again every Y days (setting: reminder_interval_days) until it is claimed.
 */
#[Signature('laundry:send-unclaimed-reminders {--dry-run : List the orders without sending anything}')]
#[Description('Send SMS/email reminders for laundry that has not been claimed')]
class SendUnclaimedReminders extends Command
{
    public function handle(): int
    {
        $afterDays = Setting::int('unclaimed_after_days');
        $interval = max(Setting::int('reminder_interval_days'), 1);

        $orders = Order::query()
            ->unclaimed($afterDays)
            ->where(fn (Builder $query) => $query
                ->whereNull('last_reminded_at')
                ->orWhere('last_reminded_at', '<=', now()->subDays($interval)))
            ->with('customer')
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No reminders due.');

            return self::SUCCESS;
        }

        foreach ($orders as $order) {
            $this->line("{$order->order_number} — {$order->customer->name} (ready since {$order->ready_at?->toDateString()})");

            if ($this->option('dry-run')) {
                continue;
            }

            $order->customer->notify(new UnclaimedReminder($order));
            $order->forceFill([
                'last_reminded_at' => now(),
                'reminder_count' => $order->reminder_count + 1,
            ])->save();
        }

        $this->info(($this->option('dry-run') ? 'Would send ' : 'Sent ').$orders->count().' reminder(s).');

        return self::SUCCESS;
    }
}
