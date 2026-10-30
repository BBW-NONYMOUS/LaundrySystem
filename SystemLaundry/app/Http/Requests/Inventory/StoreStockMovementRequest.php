<?php

namespace App\Http\Requests\Inventory;

use App\Enums\Permission;
use App\Enums\StockMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Staff may record usage (stock out); only the owner restocks or adjusts.
 */
class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        return $this->input('type') === StockMovementType::Out->value
            ? $user->canAny([Permission::InventoryStockOut->value, Permission::InventoryManage->value])
            : $user->can(Permission::InventoryManage->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isAdjustment = $this->input('type') === StockMovementType::Adjustment->value;

        return [
            'type' => ['required', Rule::enum(StockMovementType::class)],
            // Adjustments are signed (+ found extra, - spilled/missing); in/out are positive.
            'quantity' => $isAdjustment
                ? ['required', 'numeric', 'not_in:0', 'between:-99999,99999']
                : ['required', 'numeric', 'gt:0', 'max:99999'],
            'remarks' => [$isAdjustment ? 'required' : 'nullable', 'string', 'max:255'],
            'order_number' => ['nullable', 'string', Rule::exists('orders', 'order_number')],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'remarks.required' => 'Explain the adjustment (e.g. physical count correction).',
        ];
    }

    public function type(): StockMovementType
    {
        return StockMovementType::from($this->string('type')->toString());
    }
}
