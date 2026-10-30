<?php

namespace App\Http\Requests\Users;

use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\User;
use App\Rules\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * The owner creates and edits staff accounts. Customer logins come from portal sign-up.
 */
class SaveUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::UsersManage->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $isCreate = ! $user instanceof User;
        $staffRoles = array_map(fn (UserRole $role) => $role->value, array_filter(
            UserRole::cases(),
            fn (UserRole $role) => $role !== UserRole::Customer,
        ));

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($isCreate ? null : $user->id)],
            'phone' => ['nullable', 'string', new PhilippineMobile],
            'role' => ['required', Rule::in($staffRoles)],
            'password' => $isCreate
                ? ['required', 'string', Password::default(), 'confirmed']
                : ['nullable', 'string', Password::default(), 'confirmed'],
        ];
    }

    /**
     * The owner must not lock themselves out by demoting their own account.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function ($validator) {
                $user = $this->route('user');

                if ($user instanceof User && $user->is($this->user()) && $this->input('role') !== UserRole::Admin->value) {
                    $validator->errors()->add('role', 'You cannot remove your own Admin role.');
                }
            },
        ];
    }

    public function role(): UserRole
    {
        return UserRole::from($this->string('role')->toString());
    }
}
