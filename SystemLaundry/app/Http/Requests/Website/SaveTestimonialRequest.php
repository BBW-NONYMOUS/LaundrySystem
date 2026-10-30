<?php

namespace App\Http\Requests\Website;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Owner edits/approves a review, or types in one received offline (source = manual).
 */
class SaveTestimonialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::WebsiteManage->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'author_name' => ['required', 'string', 'max:100'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'max:1000'],
            'is_approved' => ['boolean'],
            'is_featured' => ['boolean'],
        ];
    }
}
