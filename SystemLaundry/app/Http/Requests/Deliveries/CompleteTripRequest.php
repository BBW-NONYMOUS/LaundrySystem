<?php

namespace App\Http\Requests\Deliveries;

use App\Enums\PaymentMethod;
use App\Models\Delivery;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Rider confirms a trip. For deliveries with a balance, the rider records the
 * cash-on-delivery collected in the same step.
 */
class CompleteTripRequest extends FormRequest
{
    public function authorize(): bool
    {
        $delivery = $this->route('delivery');

        return $delivery instanceof Delivery && (bool) $this->user()?->can('ride', $delivery);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'collected_amount' => ['nullable', 'numeric', 'gt:0', 'max:999999'],
            'payment_method' => ['required_with:collected_amount', 'nullable', Rule::enum(PaymentMethod::class)],
            'amount_tendered' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'reference_number' => [
                Rule::requiredIf(fn () => $this->filled('collected_amount') && $this->input('payment_method') !== PaymentMethod::Cash->value),
                'nullable',
                'string',
                'max:100',
            ],
        ];
    }
}
