<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::PaymentsView->value);
    }

    public function void(User $user, Payment $payment): bool
    {
        return $user->can(Permission::PaymentsVoid->value) && ! $payment->isVoided();
    }
}
