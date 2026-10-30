<?php

namespace App\Http\Requests\Public;

use App\Enums\PickupSlot;
use App\Http\Requests\Public\Concerns\ProtectsAgainstSpam;
use App\Rules\PhilippineMobile;
use App\Services\BookingService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Guest pickup request from /book.
 */
class StoreBookingRequest extends FormRequest
{
    use ProtectsAgainstSpam;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', new PhilippineMobile],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['required', 'string', 'min:10', 'max:500'],
            'pickup_date' => ['required', 'date', 'after_or_equal:today', 'before_or_equal:'.now()->addDays(BookingService::DAYS_AHEAD)->toDateString()],
            'time_slot' => ['required', Rule::enum(PickupSlot::class)],
            'service_id' => ['nullable', 'integer', Rule::exists('services', 'id')->where('is_active', true)],
            'estimated_quantity' => ['nullable', 'numeric', 'min:0', 'max:200'],
            'is_express' => ['boolean'],
            'wants_delivery' => ['boolean'],
            'special_instructions' => ['nullable', 'string', 'max:1000'],
            // Data Privacy Act (RA 10173): consent to use the details for this booking.
            'consent' => ['accepted'],
            ...$this->spamRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'address.min' => 'Please enter your full address (house no., street, barangay).',
            'pickup_date.before_or_equal' => 'You can book up to '.BookingService::DAYS_AHEAD.' days ahead.',
            'time_slot.required' => 'Choose a pickup time.',
            'consent.accepted' => 'Please agree so we can use your details for this pickup.',
            ...$this->spamMessages(),
        ];
    }

    /**
     * The validated booking fields (without consent and spam-check fields), typed for BookingService.
     *
     * @return array{name: string, phone: string, email: string|null, address: string, pickup_date: string, time_slot: string, service_id: int|null, estimated_quantity: float|null, is_express: bool, wants_delivery: bool, special_instructions: string|null}
     */
    public function bookingData(): array
    {
        return [
            'name' => $this->string('name')->trim()->toString(),
            'phone' => $this->string('phone')->toString(),
            'email' => $this->filled('email') ? $this->string('email')->toString() : null,
            'address' => $this->string('address')->trim()->toString(),
            'pickup_date' => $this->string('pickup_date')->toString(),
            'time_slot' => $this->string('time_slot')->toString(),
            'service_id' => $this->filled('service_id') ? $this->integer('service_id') : null,
            'estimated_quantity' => $this->filled('estimated_quantity') ? $this->float('estimated_quantity') : null,
            'is_express' => $this->boolean('is_express'),
            'wants_delivery' => $this->boolean('wants_delivery'),
            'special_instructions' => $this->filled('special_instructions') ? $this->string('special_instructions')->toString() : null,
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [fn (Validator $validator) => $this->checkForSpam($validator)];
    }
}
