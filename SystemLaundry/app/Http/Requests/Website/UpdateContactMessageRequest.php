<?php

namespace App\Http\Requests\Website;

use App\Enums\ContactMessageStatus;
use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::MessagesView->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ContactMessageStatus::class)],
        ];
    }

    public function status(): ContactMessageStatus
    {
        return ContactMessageStatus::from($this->string('status')->toString());
    }
}
