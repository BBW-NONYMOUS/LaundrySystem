<?php

namespace App\Http\Requests\Website;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Decline (we can't do it) or cancel (customer changed their mind) — both need a reason.
 */
class CloseBookingRequest extends FormRequest
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
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
