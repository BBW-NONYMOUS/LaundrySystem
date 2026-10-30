<?php

namespace App\Http\Requests\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Edit items before washing starts (e.g. weigh a picked-up booking, fix a quantity).
 */
class UpdateOrderRequest extends FormRequest
{
    use OrderItemRules;

    public function authorize(): bool
    {
        $order = $this->route('order');

        return $order instanceof Order && (bool) $this->user()?->can('update', $order);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $order = $this->route('order');

        // A booked pickup may be saved without items until it is weighed.
        $itemsRequirement = $order instanceof Order && $order->status === OrderStatus::Pending ? 'present' : 'required';

        return $this->itemRules($itemsRequirement);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->itemMessages();
    }
}
