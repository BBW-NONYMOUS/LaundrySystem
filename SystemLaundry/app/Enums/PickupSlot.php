<?php

namespace App\Enums;

/**
 * The pickup/delivery time slots offered everywhere (public booking, portal, counter).
 * Values are "HH:MM" so they combine directly with a date into a datetime.
 */
enum PickupSlot: string
{
    case Morning = '09:00';
    case Afternoon = '13:00';
    case LateAfternoon = '16:00';

    public function label(): string
    {
        return match ($this) {
            self::Morning => '9:00 AM',
            self::Afternoon => '1:00 PM',
            self::LateAfternoon => '4:00 PM',
        };
    }

    /**
     * Customer-facing window, e.g. "9:00 – 11:00 AM".
     */
    public function window(): string
    {
        return match ($this) {
            self::Morning => '9:00 – 11:00 AM',
            self::Afternoon => '1:00 – 3:00 PM',
            self::LateAfternoon => '4:00 – 6:00 PM',
        };
    }
}
