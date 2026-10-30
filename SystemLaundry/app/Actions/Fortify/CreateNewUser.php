<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\User;
use App\Rules\PhilippineMobile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Spatie\Permission\Models\Role;

/**
 * Public registration is for the customer portal. Staff accounts are created by the owner.
 * If the phone number already belongs to a walk-in customer, the new login is linked to
 * that record so the customer sees their existing order history.
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'phone' => ['required', 'string', new PhilippineMobile],
            'password' => $this->passwordRules(),
        ])->validate();

        $phone = (string) Customer::normalizePhone($input['phone']);
        $existing = Customer::query()->where('phone', $phone)->first();

        if ($existing?->user_id !== null) {
            throw ValidationException::withMessages([
                'phone' => 'This mobile number already has an account. Try logging in or resetting your password.',
            ]);
        }

        return DB::transaction(function () use ($input, $phone, $existing) {
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'phone' => $phone,
                'password' => $input['password'],
            ]);

            $user->assignRole(Role::findOrCreate(UserRole::Customer->value, 'web'));

            if ($existing !== null) {
                $existing->update(['user_id' => $user->id, 'email' => $existing->email ?? $user->email]);
            } else {
                Customer::query()->create([
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'phone' => $phone,
                    'email' => $user->email,
                ]);
            }

            return $user;
        });
    }
}
