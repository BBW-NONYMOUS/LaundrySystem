<?php

namespace App\Http\Requests\Payments;

use App\Enums\PaymentMethod;
use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Walk-in or online payment for an order. For cash, the cashier types what the customer
 * handed over (amount_tendered) and the change is computed.
 */
class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::PaymentsCreate->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'amount' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'amount_tendered' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'reference_number' => [
                Rule::requiredIf(fn () => $this->input('method') !== PaymentMethod::Cash->value),
                'nullable',
                'string',
                'max:100',
            ],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reference_number.required' => 'Enter the transaction reference number.',
        ];
    }

    public function paymentMethod(): PaymentMethod
    {
        return PaymentMethod::from($this->string('method')->toString());
    }
}
