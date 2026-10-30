<?php

namespace App\Http\Requests\Deliveries;

use App\Models\Delivery;
use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Reschedule a trip and/or (re)assign its rider from the Deliveries board.
 */
class UpdateDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $delivery = $this->route('delivery');

        return $delivery instanceof Delivery && (bool) $this->user()?->can('update', $delivery);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'scheduled_at' => ['sometimes', 'required', 'date', 'after_or_equal:today'],
            'address' => ['sometimes', 'required', 'string', 'max:500'],
            'contact_phone' => ['sometimes', 'required', 'string', new PhilippineMobile],
            'rider_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')],
            'notes' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
