<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Received = 'received';
    case Washing = 'washing';
    case Drying = 'drying';
    case Folding = 'folding';
    case Ready = 'ready';
    case OutForDelivery = 'out_for_delivery';
    case Completed = 'completed';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'For Pickup',
            self::Received => 'Received',
            self::Washing => 'Washing',
            self::Drying => 'Drying',
            self::Folding => 'Folding',
            self::Ready => 'Ready',
            self::OutForDelivery => 'Out for Delivery',
            self::Completed => 'Completed',
            self::Delivered => 'Delivered',
            self::Cancelled => 'Cancelled',
        };
    }

    /**
     * Tailwind color name used by the StatusBadge component.
     */
    public function color(): string
    {
        return match ($this) {
            self::Pending => 'slate',
            self::Received => 'blue',
            self::Washing => 'cyan',
            self::Drying => 'amber',
            self::Folding => 'violet',
            self::Ready => 'green',
            self::OutForDelivery => 'indigo',
            self::Completed, self::Delivered => 'emerald',
            self::Cancelled => 'red',
        };
    }

    /**
     * The state machine: which statuses this one may move to.
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Received, self::Cancelled],
            // Non-wash services (e.g. ironing only) may skip straight to Ready.
            self::Received => [self::Washing, self::Ready, self::Cancelled],
            self::Washing => [self::Drying],
            self::Drying => [self::Folding, self::Ready],
            self::Folding => [self::Ready],
            self::Ready => [self::Completed, self::OutForDelivery],
            // A failed delivery returns the order to the shelf.
            self::OutForDelivery => [self::Delivered, self::Ready],
            self::Completed, self::Delivered, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Delivered, self::Cancelled], true);
    }

    /**
     * Statuses where laundry is still being processed in the shop (counts toward overdue).
     *
     * @return list<self>
     */
    public static function inProcess(): array
    {
        return [self::Received, self::Washing, self::Drying, self::Folding];
    }

    /**
     * @return list<array{value: string, label: string, color: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $status) => [
            'value' => $status->value,
            'label' => $status->label(),
            'color' => $status->color(),
        ], self::cases());
    }
}
