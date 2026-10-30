<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Delivery;
use App\Models\User;

class DeliveryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::DeliveriesView->value);
    }

    public function update(User $user, Delivery $delivery): bool
    {
        return $user->can(Permission::DeliveriesAssign->value);
    }

    /**
     * Riders may only act on trips assigned to them.
     */
    public function ride(User $user, Delivery $delivery): bool
    {
        return $user->can(Permission::DeliveriesOwn->value) && $delivery->rider_id === $user->id;
    }
}
