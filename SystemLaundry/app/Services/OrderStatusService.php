<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\OrderCompleted;
use App\Notifications\OrderOutForDelivery;
use App\Notifications\OrderReady;
use App\Notifications\OrderReceived;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only way an order changes status. Enforces the OrderStatus state machine and the
 * business rules around it, records the history row, and notifies the customer.
 */
class OrderStatusService
{
    public function __construct(private PricingService $pricing) {}

    /**
     * @throws ValidationException when the move is not allowed
     */
    public function transition(Order $order, OrderStatus $to, ?User $actor, ?string $notes = null): Order
    {
        $order = DB::transaction(function () use ($order, $to, $actor, $notes) {
            // Lock the row: two staff scanning the same QR tag at once must not both advance it.
            /** @var Order $order */
            $order = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            $from = $order->status;

            if (! $from->canTransitionTo($to)) {
                throw ValidationException::withMessages([
                    'status' => "An order that is {$from->label()} cannot be moved to {$to->label()}.",
                ]);
            }

            $this->checkRules($order, $from, $to, $actor, $notes);
            $this->applySideEffects($order, $from, $to, $notes);

            $order->status = $to;
            $order->save();

            OrderStatusHistory::query()->create([
                'order_id' => $order->id,
                'from_status' => $from,
                'to_status' => $to,
                'changed_by' => $actor?->id,
                'notes' => $notes,
                'created_at' => now(),
            ]);

            $this->notifyCustomer($order, $from, $to);

            return $order;
        });

        return $order->refresh();
    }

    private function checkRules(Order $order, OrderStatus $from, OrderStatus $to, ?User $actor, ?string $notes): void
    {
        if ($from === OrderStatus::Pending && $to === OrderStatus::Received && ! $order->items()->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Weigh the laundry and add at least one item before marking it as received.',
            ]);
        }

        if ($to === OrderStatus::Cancelled) {
            if (blank($notes)) {
                throw ValidationException::withMessages(['notes' => 'Please give a reason for cancelling.']);
            }

            if ((float) $order->amount_paid > 0) {
                throw ValidationException::withMessages([
                    'status' => 'This order has payments. Void or refund them before cancelling.',
                ]);
            }
        }

        if ($from === OrderStatus::OutForDelivery && $to === OrderStatus::Ready && blank($notes)) {
            throw ValidationException::withMessages(['notes' => 'Please give the reason the delivery failed.']);
        }

        if ($to === OrderStatus::OutForDelivery && $order->delivery()->whereNotNull('rider_id')->doesntExist()) {
            throw ValidationException::withMessages([
                'status' => 'Schedule the delivery and assign a rider first.',
            ]);
        }

        // Laundry is never released while money is owed, unless the owner overrides with a reason.
        if (in_array($to, [OrderStatus::Completed, OrderStatus::Delivered], true) && $order->balance > 0) {
            $canOverride = $actor?->can(Permission::OrdersOverride->value) && filled($notes);

            if (! $canOverride) {
                throw ValidationException::withMessages([
                    'status' => 'Collect the remaining balance of '.Setting::get('currency_symbol', '₱').number_format($order->balance, 2).' before releasing this order.',
                ]);
            }
        }
    }

    private function applySideEffects(Order $order, OrderStatus $from, OrderStatus $to, ?string $notes): void
    {
        $now = now();

        match ($to) {
            OrderStatus::Received => $this->startProcessing($order),
            OrderStatus::Ready => $order->ready_at ??= $now,
            OrderStatus::Completed, OrderStatus::Delivered => $order->completed_at = $now,
            OrderStatus::Cancelled => $order->forceFill([
                'cancelled_at' => $now,
                'cancellation_reason' => $notes,
            ]),
            default => null,
        };

        $delivery = $order->delivery;

        if ($delivery === null) {
            if ($to === OrderStatus::Cancelled) {
                $order->pickup()->whereIn('status', [DeliveryStatus::Scheduled, DeliveryStatus::InTransit])
                    ->update(['status' => DeliveryStatus::Cancelled]);
            }

            return;
        }

        // Keep the delivery trip in step with the order.
        match (true) {
            $to === OrderStatus::OutForDelivery => $delivery->forceFill([
                'status' => DeliveryStatus::InTransit,
                'attempts' => $delivery->attempts + 1,
            ])->save(),
            $to === OrderStatus::Delivered => $delivery->forceFill([
                'status' => DeliveryStatus::Completed,
                'completed_at' => $now,
            ])->save(),
            $from === OrderStatus::OutForDelivery && $to === OrderStatus::Ready => $delivery->forceFill([
                'status' => DeliveryStatus::Failed,
                'failure_reason' => $notes,
            ])->save(),
            $to === OrderStatus::Cancelled => $order->deliveries()
                ->whereIn('status', [DeliveryStatus::Scheduled, DeliveryStatus::InTransit])
                ->update(['status' => DeliveryStatus::Cancelled]),
            default => null,
        };
    }

    /**
     * A booked pickup arrives at the shop: start the clock and price it with the real weights.
     */
    private function startProcessing(Order $order): void
    {
        $order->loadMissing('items.service');
        $services = $order->items->pluck('service')->filter()->unique('id')->values();

        $order->received_at = now();
        $order->due_at = $this->pricing->dueDate($services, $order->is_express, $order->received_at);
        $order->recalculateTotals($this->pricing->expressSurchargePercent());

        $order->pickup()->where('status', '!=', DeliveryStatus::Completed)->update([
            'status' => DeliveryStatus::Completed,
            'completed_at' => now(),
        ]);
    }

    private function notifyCustomer(Order $order, OrderStatus $from, OrderStatus $to): void
    {
        $notification = match (true) {
            $from === OrderStatus::Pending && $to === OrderStatus::Received => new OrderReceived($order),
            // A failed delivery coming back to the shelf is not "ready" news for the customer.
            $to === OrderStatus::Ready && $from !== OrderStatus::OutForDelivery => new OrderReady($order),
            $to === OrderStatus::OutForDelivery => new OrderOutForDelivery($order),
            in_array($to, [OrderStatus::Completed, OrderStatus::Delivered], true) => new OrderCompleted($order),
            default => null,
        };

        if ($notification !== null) {
            $order->customer->notify($notification);
        }
    }

    /**
     * Statuses this user may move the order to next (used to render action buttons).
     *
     * @return list<OrderStatus>
     */
    public function availableTransitions(Order $order, User $user): array
    {
        $allowed = $order->status->allowedTransitions();

        if (! $user->can(Permission::OrdersCancel->value)) {
            $allowed = array_values(array_filter($allowed, fn (OrderStatus $status) => $status !== OrderStatus::Cancelled));
        }

        // "Out for delivery" only makes sense when a delivery trip has been scheduled.
        if ($order->delivery()->doesntExist()) {
            $allowed = array_values(array_filter($allowed, fn (OrderStatus $status) => $status !== OrderStatus::OutForDelivery));
        }

        return $allowed;
    }
}
