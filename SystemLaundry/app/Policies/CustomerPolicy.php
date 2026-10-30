<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::CustomersView->value);
    }

    public function view(User $user, Customer $customer): bool
    {
        return $user->can(Permission::CustomersView->value);
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::CustomersCreate->value);
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->can(Permission::CustomersUpdate->value);
    }

    /**
     * Customers with unfinished orders can't be removed.
     */
    public function delete(User $user, Customer $customer): bool
    {
        return $user->can(Permission::CustomersDelete->value)
            && $customer->orders()->open()->doesntExist();
    }
}
