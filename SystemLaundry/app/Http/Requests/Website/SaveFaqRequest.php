<?php

namespace App\Http\Requests\Website;

use App\Enums\Permission;
use App\Models\Faq;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SaveFaqRequest extends FormRequest
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
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:3000'],
            'category' => ['required', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_published' => ['boolean'],
            'show_on_home' => ['boolean'],
        ];
    }

    /**
     * The Home page shows at most five questions (docs/public-site/04 §3.10).
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if (! $this->boolean('show_on_home') || ! $this->boolean('is_published', true)) {
                return;
            }

            $current = $this->route('faq');
            $currentId = $current instanceof Faq ? $current->getKey() : null;
            $others = Faq::query()->where('show_on_home', true)->where('is_published', true)
                ->when($currentId !== null, fn ($query) => $query->whereKeyNot($currentId))
                ->count();

            if ($others >= Faq::HOME_LIMIT) {
                $validator->errors()->add('show_on_home', 'The Home page already shows '.Faq::HOME_LIMIT.' questions. Turn one off first.');
            }
        }];
    }
}
