<?php

namespace App\Http\Requests\Inventory;

use App\Enums\Permission;
use App\Models\InventoryItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SaveInventoryItemRequest extends FormRequest
{
    public const UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'pack', 'box', 'roll'];

    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::InventoryManage->value);
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('sku'))) {
            $this->merge(['sku' => Str::upper(trim($this->input('sku')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $item = $this->route('item');
        $isCreate = ! $item instanceof InventoryItem;

        return [
            'sku' => ['required', 'string', 'max:30', 'alpha_dash:ascii', Rule::unique('inventory_items', 'sku')->ignore($isCreate ? null : $item->id)],
            'name' => ['required', 'string', 'max:100'],
            'unit' => ['required', Rule::in(self::UNITS)],
            'reorder_level' => ['required', 'numeric', 'min:0', 'max:99999'],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'is_active' => ['boolean'],
            // Only on create: recorded as the first "Stock In" ledger entry.
            'opening_quantity' => $isCreate ? ['nullable', 'numeric', 'min:0', 'max:99999'] : ['prohibited'],
        ];
    }
}
