<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Setting;
use App\Notifications\UnclaimedReminder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Overdue orders (past due, still in process) and unclaimed laundry (ready for X days).
 */
class MonitoringController extends Controller
{
    public function overdue(Request $request): Response
    {
        $orders = Order::query()->overdue()->with('customer')->withCount('items')
            ->orderBy('due_at')
            ->paginate($this->perPage($request, 25))->withQueryString();

        return Inertia::render('monitoring/overdue', [
            'orders' => OrderResource::collection($orders),
        ]);
    }

    public function unclaimed(Request $request): Response
    {
        $days = Setting::int('unclaimed_after_days');

        $orders = Order::query()->unclaimed($days)->with('customer')->withCount('items')
            ->orderBy('ready_at')
            ->paginate($this->perPage($request, 25))->withQueryString();

        return Inertia::render('monitoring/unclaimed', [
            'orders' => OrderResource::collection($orders),
            'unclaimedAfterDays' => $days,
            'reminderIntervalDays' => Setting::int('reminder_interval_days'),
        ]);
    }

    /**
     * Send a reminder now instead of waiting for the daily schedule.
     */
    public function remind(Order $order): RedirectResponse
    {
        Gate::authorize('remind', $order);

        $order->customer->notify(new UnclaimedReminder($order));
        $order->forceFill(['last_reminded_at' => now(), 'reminder_count' => $order->reminder_count + 1])->save();

        $this->toast("Reminder sent to {$order->customer->name}.");

        return back();
    }
}
