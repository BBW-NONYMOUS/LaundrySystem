<?php

namespace App\Http\Requests\Public;

use App\Http\Requests\Public\Concerns\ProtectsAgainstSpam;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Rating from the "Rate us" link in the order-completed message.
 */
class StoreFeedbackRequest extends FormRequest
{
    use ProtectsAgainstSpam;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['required', 'string', 'min:10', 'max:1000'],
            ...$this->spamRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.required' => 'Tap a star to rate us.',
            'comment.min' => 'Tell us a little more (at least 10 characters).',
            ...$this->spamMessages(),
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [fn (Validator $validator) => $this->checkForSpam($validator)];
    }
}
