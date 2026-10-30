<?php

namespace App\Http\Requests\Public;

use App\Http\Requests\Public\Concerns\ProtectsAgainstSpam;
use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreContactMessageRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:150'],
            // At least one way to reply.
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'string', new PhilippineMobile],
            'subject' => ['nullable', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'consent' => ['accepted'],
            ...$this->spamRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required_without' => 'Give us an email or a mobile number so we can reply.',
            'phone.required_without' => 'Give us a mobile number or an email so we can reply.',
            'message.min' => 'Please tell us a little more (at least 10 characters).',
            'consent.accepted' => 'Please agree so we can use your details to reply.',
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
