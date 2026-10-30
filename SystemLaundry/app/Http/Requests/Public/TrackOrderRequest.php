<?php

namespace App\Http\Requests\Public;

use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Public order lookup: order number + the mobile number on the order.
 */
class TrackOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Accept "lnd-20261023-0012", "20261023-0012" or "LND 20261023 0012".
     */
    protected function prepareForValidation(): void
    {
        $number = strtoupper(trim((string) $this->input('order_number')));
        $number = preg_replace('/[\s_]+/', '-', $number) ?? $number;

        if (preg_match('/^\d{8}-\d{4}$/', $number) === 1) {
            $number = "LND-{$number}";
        }

        $this->merge(['order_number' => $number]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'order_number' => ['required', 'string', 'max:30'],
            'phone' => ['required', 'string', new PhilippineMobile],
            'inline' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'order_number.required' => 'Enter the order number from your receipt.',
        ];
    }
}
