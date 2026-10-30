<?php

namespace App\Rules;

use App\Models\Customer;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Accepts 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX, with optional spaces or dashes.
 * A mobile number is required because SMS is the main notification channel.
 */
class PhilippineMobile implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = is_string($value) ? Customer::normalizePhone($value) : null;

        if ($normalized === null || preg_match('/^09\d{9}$/', $normalized) !== 1) {
            $fail('Enter a valid mobile number, e.g. 0917 123 4567.');
        }
    }
}
