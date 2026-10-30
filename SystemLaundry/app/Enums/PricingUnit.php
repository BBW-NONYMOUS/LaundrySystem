<?php

namespace App\Enums;

enum PricingUnit: string
{
    case PerKg = 'per_kg';
    case PerItem = 'per_item';

    public function label(): string
    {
        return match ($this) {
            self::PerKg => 'Per Kilo',
            self::PerItem => 'Per Item',
        };
    }

    public function shortLabel(): string
    {
        return match ($this) {
            self::PerKg => 'kg',
            self::PerItem => 'pc',
        };
    }
}
