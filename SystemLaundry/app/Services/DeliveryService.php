<?php

namespace App\Services;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Enums\OrderStatus;
use App\Enums\UserRole;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pickup and delivery trips: scheduling, rider assignment, and the rider's
 * start / complete / fail actions. Delivery-type trips move the order status
 * through OrderStatusService so the two never drift apart.
 */
class DeliveryService
{
    public function __construct(
        private OrderStatusService $statuses,
        private PricingService $pricing,
    ) {}

    /**
     * Schedule (or reschedule) a trip. Adding a trip that wasn't booked at checkout adds its fee.
     */
    public function schedule(
        Order $order,
        DeliveryType $type,
        CarbonInterface $scheduledAt,
        string $address,
        string $contactPhone,
        ?User $rider,
        User $actor,
        ?string $notes = null,
    ): Delivery {
        if ($order->status->isFinal()) {
            throw ValidationException::withMessages(['order' => 'This order is already closed.']);
        }

        if ($type === DeliveryType::Pickup && $order->status !== OrderStatus::Pending) {
            throw ValidationException::withMessages(['type' => 'This laundry is already in the shop.']);
        }

        if ($rider !== null) {
            $this->ensureRider($rider);
        }

        return DB::transaction(function () use ($order, $type, $scheduledAt, $address, $contactPhone, $rider, $actor, $notes) {
            $existing = $order->deliveries()->where('type', $type)->first();

            if ($existing?->status === DeliveryStatus::Completed) {
                throw ValidationException::withMessages(['type' => "This order's {$type->label()} is already completed."]);
            }

            if ($existing === null) {
                $order->delivery_fee = number_format((float) $order->delivery_fee + $this->pricing->deliveryFeePerTrip(), 2, '.', '');
                $order->recalculateTotals($this->pricing->expressSurchargePercent());
            }

            return $order->deliveries()->updateOrCreate(['type' => $type], [
                'status' => DeliveryStatus::Scheduled,
                'scheduled_at' => $scheduledAt,
                'address' => $address,
                'contact_phone' => $contactPhone,
                'rider_id' => $rider->id ?? $existing?->rider_id,
                'assigned_by' => $rider !== null ? $actor->id : $existing?->assigned_by,
                'notes' => $notes,
            ]);
        });
    }

    public function assign(Delivery $delivery, User $rider, User $actor): Delivery
    {
        $this->ensureRider($rider);
        $this->ensureOpen($delivery);

        $delivery->update(['rider_id' => $rider->id, 'assigned_by' => $actor->id]);

        return $delivery;
    }

    /**
     * Rider leaves the shop (delivery) or heads to the customer (pickup).
     */
    public function start(Delivery $delivery, User $rider): Delivery
    {
        $this->ensureAssignedTo($delivery, $rider);
        $this->ensureOpen($delivery);

        if ($delivery->type === DeliveryType::Delivery) {
            if ($delivery->order->status !== OrderStatus::Ready) {
                throw ValidationException::withMessages(['delivery' => 'The laundry is not ready yet.']);
            }

            $this->statuses->transition($delivery->order, OrderStatus::OutForDelivery, $rider);
        } else {
            $delivery->update(['status' => DeliveryStatus::InTransit, 'attempts' => $delivery->attempts + 1]);
        }

        return $delivery->refresh();
    }

    /**
     * Rider handed the laundry over (delivery) or collected it from the customer (pickup).
     * A pickup's order stays Pending until the cashier weighs it in.
     */
    public function complete(Delivery $delivery, User $rider): Delivery
    {
        $this->ensureAssignedTo($delivery, $rider);

        if ($delivery->status !== DeliveryStatus::InTransit) {
            throw ValidationException::withMessages(['delivery' => 'Start the trip before completing it.']);
        }

        if ($delivery->type === DeliveryType::Delivery) {
            $this->statuses->transition($delivery->order, OrderStatus::Delivered, $rider);
        } else {
            $delivery->update(['status' => DeliveryStatus::Completed, 'completed_at' => now()]);
        }

        return $delivery->refresh();
    }

    public function fail(Delivery $delivery, User $rider, string $reason): Delivery
    {
        $this->ensureAssignedTo($delivery, $rider);

        if ($delivery->status !== DeliveryStatus::InTransit) {
            throw ValidationException::withMessages(['delivery' => 'Only trips on the road can be marked as failed.']);
        }

        if ($delivery->type === DeliveryType::Delivery) {
            $this->statuses->transition($delivery->order, OrderStatus::Ready, $rider, $reason);
        } else {
            $delivery->update(['status' => DeliveryStatus::Failed, 'failure_reason' => $reason]);
        }

        return $delivery->refresh();
    }

    private function ensureRider(User $user): void
    {
        if (! $user->is_active || ! $user->hasRole(UserRole::Rider->value)) {
            throw ValidationException::withMessages(['rider_id' => 'Choose an active delivery rider.']);
        }
    }

    private function ensureOpen(Delivery $delivery): void
    {
        if (in_array($delivery->status, [DeliveryStatus::Completed, DeliveryStatus::Cancelled], true)) {
            throw ValidationException::withMessages(['delivery' => 'This trip is already closed.']);
        }
    }

    private function ensureAssignedTo(Delivery $delivery, User $rider): void
    {
        if ($delivery->rider_id !== $rider->id) {
            throw ValidationException::withMessages(['delivery' => 'This trip is assigned to another rider.']);
        }
    }
}
