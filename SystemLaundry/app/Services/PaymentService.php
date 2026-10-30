<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Records and voids payments and keeps the order's amount_paid / payment_status cache in sync.
 */
class PaymentService
{
    /**
     * @throws ValidationException
     */
    public function record(
        Order $order,
        PaymentMethod $method,
        float $amount,
        User $receivedBy,
        ?float $tendered = null,
        ?string $reference = null,
        ?string $notes = null,
    ): Payment {
        return DB::transaction(function () use ($order, $method, $amount, $receivedBy, $tendered, $reference, $notes) {
            // Lock the order so two cashiers can't both collect the same balance.
            /** @var Order $order */
            $order = Order::query()->lockForUpdate()->findOrFail($order->getKey());
            $amount = round($amount, 2);

            $this->validate($order, $method, $amount, $tendered, $reference);

            $payment = $order->payments()->create([
                'received_by' => $receivedBy->id,
                'method' => $method,
                'reference_number' => $method->requiresReference() ? $reference : null,
                'amount' => $amount,
                'amount_tendered' => $method === PaymentMethod::Cash ? round($tendered ?? $amount, 2) : null,
                'paid_at' => now(),
                'notes' => $notes,
            ]);

            $order->refreshPaymentStatus();

            return $payment;
        });
    }

    /**
     * Voiding keeps the row for the audit trail but removes it from the order's paid amount.
     */
    public function void(Payment $payment, User $voidedBy, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $voidedBy, $reason) {
            /** @var Payment $payment */
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->getKey());

            if ($payment->isVoided()) {
                throw ValidationException::withMessages(['payment' => 'This payment has already been voided.']);
            }

            $payment->update([
                'voided_at' => now(),
                'voided_by' => $voidedBy->id,
                'void_reason' => $reason,
            ]);

            $payment->order->refreshPaymentStatus();

            return $payment;
        });
    }

    private function validate(Order $order, PaymentMethod $method, float $amount, ?float $tendered, ?string $reference): void
    {
        $symbol = Setting::get('currency_symbol', '₱');

        if ($order->status === OrderStatus::Cancelled) {
            throw ValidationException::withMessages(['amount' => 'Payments cannot be added to a cancelled order.']);
        }

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => 'The amount must be greater than zero.']);
        }

        if ($amount > $order->balance + 0.001) {
            throw ValidationException::withMessages([
                'amount' => "The amount is more than the remaining balance of {$symbol}".number_format($order->balance, 2).'.',
            ]);
        }

        if ($method === PaymentMethod::Cash && $tendered !== null && $tendered + 0.001 < $amount) {
            throw ValidationException::withMessages([
                'amount_tendered' => 'Cash received is less than the amount being paid.',
            ]);
        }

        if ($method->requiresReference() && blank($reference)) {
            throw ValidationException::withMessages([
                'reference_number' => "Enter the {$method->label()} reference number.",
            ]);
        }
    }
}
