<?php

namespace App\Http\Requests\Portal;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A customer books a pickup from the portal. Weights are unknown until the laundry
 * reaches the shop, so no items are priced here. Contact details come from the
 * customer's profile; an address is asked for only when the profile has none.
 */
class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::PortalAccess->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'scheduled_at' => ['required', 'date', 'after:now'],
            'address' => [Rule::requiredIf(fn () => blank($this->user()?->customer?->address)), 'nullable', 'string', 'max:500'],
            'wants_delivery' => ['boolean'],
            'is_express' => ['boolean'],
            'service_ids' => ['nullable', 'array'],
            'service_ids.*' => ['integer', Rule::exists('services', 'id')->where('is_active', true)],
            'special_instructions' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
