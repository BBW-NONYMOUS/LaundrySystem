<?php

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permission::OrdersView->value);
    }

    /**
     * Staff see every order; riders see orders they carry; customers see their own.
     */
    public function view(User $user, Order $order): bool
    {
        if ($user->can(Permission::OrdersView->value)) {
            return true;
        }

        if ($user->can(Permission::DeliveriesOwn->value) && $order->deliveries()->where('rider_id', $user->id)->exists()) {
            return true;
        }

        return $user->can(Permission::PortalAccess->value)
            && $order->customer->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->can(Permission::OrdersCreate->value);
    }

    public function update(User $user, Order $order): bool
    {
        return $user->can(Permission::OrdersUpdate->value)
            && in_array($order->status, [OrderStatus::Pending, OrderStatus::Received], true);
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $user->can(Permission::OrdersUpdateStatus->value) && ! $order->status->isFinal();
    }

    public function cancel(User $user, Order $order): bool
    {
        return $user->can(Permission::OrdersCancel->value)
            && $order->status->canTransitionTo(OrderStatus::Cancelled);
    }

    public function remind(User $user, Order $order): bool
    {
        return $user->can(Permission::MonitoringView->value) && $order->status === OrderStatus::Ready;
    }
}
