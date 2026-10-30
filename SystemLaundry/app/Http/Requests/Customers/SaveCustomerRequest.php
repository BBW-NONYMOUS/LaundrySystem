<?php

namespace App\Http\Requests\Customers;

use App\Models\Customer;
use App\Rules\PhilippineMobile;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/**
 * Create and edit customers. The phone is normalized before the unique check, so
 * "+63 917..." and "0917..." are caught as the same customer.
 */
class SaveCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        $customer = $this->route('customer');

        return $customer instanceof Customer
            ? (bool) $this->user()?->can('update', $customer)
            : (bool) $this->user()?->can('create', Customer::class);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('phone'))) {
            $this->merge(['phone' => Customer::normalizePhone($this->input('phone'))]);
        }
    }

    /**
     * @return array<string, array<int, ValidationRule|string|Unique>>
     */
    public function rules(): array
    {
        $customer = $this->route('customer');

        return [
            'name' => ['required', 'string', 'max:150'],
            'phone' => [
                'required',
                'string',
                new PhilippineMobile,
                // Includes soft-deleted customers: the phone stays reserved by the DB unique index.
                Rule::unique('customers', 'phone')->ignore($customer instanceof Customer ? $customer->id : null),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.unique' => 'A customer with this mobile number already exists. Search for them instead.',
        ];
    }
}
