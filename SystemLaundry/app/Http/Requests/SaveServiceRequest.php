<?php

namespace App\Http\Requests;

use App\Enums\Permission;
use App\Enums\PricingUnit;
use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::ServicesManage->value);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => Str::upper(trim($this->input('code')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $service = $this->route('service');
        $ignore = $service instanceof Service ? $service->id : null;

        return [
            'code' => ['required', 'string', 'max:20', 'alpha_dash:ascii', Rule::unique('services', 'code')->ignore($ignore)],
            'name' => ['required', 'string', 'max:100', Rule::unique('services', 'name')->ignore($ignore)],
            'description' => ['nullable', 'string', 'max:500'],
            'pricing_unit' => ['required', Rule::enum(PricingUnit::class)],
            'price' => ['required', 'numeric', 'min:0', 'max:99999'],
            'min_quantity' => ['required', 'numeric', 'min:0', 'max:999'],
            'turnaround_hours' => ['required', 'integer', 'min:1', 'max:720'],
            'express_turnaround_hours' => ['nullable', 'integer', 'min:1', 'lt:turnaround_hours'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'express_turnaround_hours.lt' => 'Express turnaround must be faster than the regular turnaround.',
        ];
    }
}
