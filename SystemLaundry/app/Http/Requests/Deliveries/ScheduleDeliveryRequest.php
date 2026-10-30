<?php

namespace App\Http\Requests\Deliveries;

use App\Enums\DeliveryType;
use App\Enums\Permission;
use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScheduleDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::DeliveriesAssign->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(DeliveryType::class)],
            'scheduled_at' => ['required', 'date', 'after_or_equal:today'],
            'address' => ['required', 'string', 'max:500'],
            'contact_phone' => ['required', 'string', new PhilippineMobile],
            'rider_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function type(): DeliveryType
    {
        return DeliveryType::from($this->string('type')->toString());
    }
}
