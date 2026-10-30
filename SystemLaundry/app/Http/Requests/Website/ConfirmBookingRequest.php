<?php

namespace App\Http\Requests\Website;

use App\Enums\Permission;
use App\Enums\PickupSlot;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Staff confirm a website booking, optionally moving it to another date/slot and
 * assigning a rider straight away.
 */
class ConfirmBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::BookingsManage->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rider_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)],
            'pickup_date' => ['nullable', 'date', 'after_or_equal:today'],
            'time_slot' => ['nullable', Rule::enum(PickupSlot::class)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->filled('rider_id') && ! User::query()->whereKey($this->integer('rider_id'))->role(UserRole::Rider->value)->exists()) {
                    $validator->errors()->add('rider_id', 'Choose a delivery rider.');
                }
            },
        ];
    }

    public function rider(): ?User
    {
        return $this->filled('rider_id') ? User::query()->find($this->integer('rider_id')) : null;
    }
}
