<?php

namespace App\Http\Requests\Orders;

use App\Enums\PaymentMethod;
use App\Enums\UserRole;
use App\Models\Order;
use App\Models\User;
use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The New Order form: customer (existing or quick-add), items, express, schedule and
 * an optional payment at drop-off. Totals are never accepted from the browser.
 */
class StoreOrderRequest extends FormRequest
{
    use OrderItemRules;

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', Order::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $riderRule = Rule::exists('users', 'id')->where('is_active', true);

        return [
            'customer_id' => ['nullable', 'required_without:customer', 'integer', Rule::exists('customers', 'id')->whereNull('deleted_at')],
            'customer' => ['nullable', 'required_without:customer_id', 'array'],
            'customer.name' => ['required_with:customer', 'string', 'max:150'],
            'customer.phone' => ['required_with:customer', 'string', new PhilippineMobile],
            'customer.email' => ['nullable', 'email', 'max:255'],
            'customer.address' => ['nullable', 'string', 'max:500'],

            ...$this->itemRules('required_without:pickup'),

            'pickup' => ['nullable', 'array'],
            'pickup.scheduled_at' => ['required_with:pickup', 'date', 'after_or_equal:today'],
            'pickup.address' => ['required_with:pickup', 'string', 'max:500'],
            'pickup.contact_phone' => ['nullable', 'string', new PhilippineMobile],
            'pickup.rider_id' => ['nullable', 'integer', $riderRule],

            'delivery' => ['nullable', 'array'],
            'delivery.scheduled_at' => ['required_with:delivery', 'date', 'after_or_equal:today'],
            'delivery.address' => ['required_with:delivery', 'string', 'max:500'],
            'delivery.contact_phone' => ['nullable', 'string', new PhilippineMobile],
            'delivery.rider_id' => ['nullable', 'integer', $riderRule],

            'payment' => ['nullable', 'array'],
            'payment.method' => ['required_with:payment.amount', 'nullable', Rule::enum(PaymentMethod::class)],
            'payment.amount' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'payment.amount_tendered' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'payment.reference_number' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->itemMessages(),
            'customer_id.required_without' => 'Search for a customer or add a new one.',
            'customer.required_without' => 'Search for a customer or add a new one.',
        ];
    }

    /**
     * Assigned riders must actually be riders.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function ($validator) {
                foreach (['pickup', 'delivery'] as $trip) {
                    $riderId = $this->input("{$trip}.rider_id");

                    if ($riderId && ! User::query()->whereKey($riderId)->role(UserRole::Rider->value)->exists()) {
                        $validator->errors()->add("{$trip}.rider_id", 'Choose a delivery rider.');
                    }
                }
            },
        ];
    }
}
