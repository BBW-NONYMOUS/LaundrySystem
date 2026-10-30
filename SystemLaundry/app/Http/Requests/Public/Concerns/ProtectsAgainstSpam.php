<?php

namespace App\Http\Requests\Public\Concerns;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Validator;

/**
 * Invisible spam checks for public forms (no CAPTCHA):
 *  - honeypot: a hidden "website" field real visitors never fill in;
 *  - time trap: the page hands out an encrypted timestamp (`form_token`); forms posted in
 *    under 3 seconds (bots) or after 2 hours (stale/replayed) are rejected.
 * Rate limiting on the routes covers the rest.
 */
trait ProtectsAgainstSpam
{
    private const MIN_SECONDS = 3;

    private const MAX_SECONDS = 7200;

    /**
     * Token the page puts in a hidden field.
     */
    public static function formToken(): string
    {
        return Crypt::encryptString((string) now()->getTimestamp());
    }

    /**
     * @return array<string, list<string>>
     */
    protected function spamRules(): array
    {
        return [
            'website' => ['nullable', 'string', 'max:255'],
            'form_token' => ['required', 'string'],
        ];
    }

    protected function checkForSpam(Validator $validator): void
    {
        $failed = filled($this->input('website'));

        try {
            $age = now()->getTimestamp() - (int) Crypt::decryptString((string) $this->input('form_token'));
            $failed = $failed || $age < self::MIN_SECONDS || $age > self::MAX_SECONDS;
        } catch (DecryptException) {
            $failed = true;
        }

        if ($failed) {
            // One vague message: don't tell bots which check caught them.
            $validator->errors()->add('form', 'We couldn’t send that. Please refresh the page and try again.');
        }
    }

    /**
     * @return array<string, string>
     */
    protected function spamMessages(): array
    {
        return [
            'form_token.required' => 'We couldn’t send that. Please refresh the page and try again.',
        ];
    }
}
