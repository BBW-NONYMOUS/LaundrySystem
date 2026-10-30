<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OverdueOrdersDigest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * In-app alert to the owner and counter staff listing laundry that is past due.
 */
#[Signature('laundry:notify-overdue')]
#[Description('Alert staff about orders that are past their due time and still in process')]
class NotifyOverdueOrders extends Command
{
    public function handle(): int
    {
        $orderNumbers = Order::query()->overdue()->orderBy('due_at')->get(['order_number'])
            ->map(fn (Order $order) => $order->order_number);

        if ($orderNumbers->isEmpty()) {
            $this->info('No overdue orders.');

            return self::SUCCESS;
        }

        // The owner and the counter act on late laundry; washers see it on the board already.
        $recipients = User::query()->active()->role([UserRole::Admin->value, UserRole::Cashier->value])->get();

        Notification::send($recipients, new OverdueOrdersDigest($orderNumbers->count(), $orderNumbers->values()->all()));

        $this->info("{$orderNumbers->count()} overdue order(s); notified {$recipients->count()} staff.");

        return self::SUCCESS;
    }
}
