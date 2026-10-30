<?php

namespace App\Http\Requests\Orders;

use Illuminate\Validation\Rule;

/**
 * Item, express and discount rules shared by the create and edit order forms.
 */
trait OrderItemRules
{
    /**
     * @return array<string, mixed>
     */
    protected function itemRules(string $itemsRequirement): array
    {
        return [
            'items' => [$itemsRequirement, 'array', 'max:20'],
            'items.*.service_id' => ['required', 'integer', Rule::exists('services', 'id')->where('is_active', true)],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999'],
            'items.*.piece_count' => ['nullable', 'integer', 'min:0', 'max:999'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
            'is_express' => ['boolean'],
            'special_instructions' => ['nullable', 'string', 'max:1000'],
            'discount_amount' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'discount_reason' => [
                Rule::requiredIf(fn () => (float) $this->input('discount_amount') > 0),
                'nullable',
                'string',
                'max:255',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function itemMessages(): array
    {
        return [
            'items.required' => 'Add at least one item.',
            'items.required_without' => 'Add at least one item, or schedule a pickup.',
            'items.*.service_id.required' => 'Choose a service.',
            'items.*.service_id.exists' => 'This service is not available.',
            'items.*.quantity.gt' => 'Enter a quantity greater than zero.',
            'discount_reason.required' => 'Give a reason for the discount (e.g. Senior Citizen).',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'items.*.quantity' => 'quantity',
            'items.*.service_id' => 'service',
            'items.*.piece_count' => 'piece count',
        ];
    }
}
