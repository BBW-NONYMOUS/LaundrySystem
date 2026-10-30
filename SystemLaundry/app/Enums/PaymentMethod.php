<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case GCash = 'gcash';
    case Maya = 'maya';
    case BankTransfer = 'bank_transfer';
    case Card = 'card';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash',
            self::GCash => 'GCash',
            self::Maya => 'Maya',
            self::BankTransfer => 'Bank Transfer',
            self::Card => 'Card',
        };
    }

    /**
     * Non-cash payments must carry a reference number so they can be reconciled.
     */
    public function requiresReference(): bool
    {
        return $this !== self::Cash;
    }
}
