<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\Users\SaveUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff accounts (feature: staff information management + role-based access).
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()
            ->with('roles:id,name')
            ->whereDoesntHave('roles', fn (Builder $roles) => $roles->where('name', UserRole::Customer->value));

        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(fn (Builder $query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        if (UserRole::tryFrom($request->string('role')->toString()) !== null) {
            $query->role($request->string('role')->toString());
        }

        if ($request->filled('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        $this->applySort($query, $request, [
            'name' => 'name',
            'email' => 'email',
            'last_login_at' => 'last_login_at',
            'created_at' => 'created_at',
        ], default: 'name', defaultDirection: 'asc');

        return Inertia::render('users/index', [
            'users' => UserResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => $this->filters($request, ['search', 'role', 'active']),
            'roles' => collect(UserRole::cases())
                ->reject(fn (UserRole $role) => $role === UserRole::Customer)
                ->map(fn (UserRole $role) => ['value' => $role->value, 'label' => $role->label()])
                ->values(),
        ]);
    }

    public function store(SaveUserRequest $request): RedirectResponse
    {
        $user = User::query()->create([
            ...$request->safe()->only(['name', 'email', 'phone', 'password']),
            'is_active' => true,
        ]);

        // The owner vouches for staff emails, so skip the verification email.
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->syncRoles([$request->role()->value]);

        $this->toast("{$user->name} can now log in as {$request->role()->label()}.");

        return back();
    }

    public function update(SaveUserRequest $request, User $user): RedirectResponse
    {
        abort_if($user->hasRole(UserRole::Customer->value), 404);

        $user->fill($request->safe()->only(['name', 'email', 'phone']));

        if ($request->filled('password')) {
            $user->password = $request->string('password')->toString();
        }

        $user->save();
        $user->syncRoles([$request->role()->value]);

        activity('users')->performedOn($user)->causedBy($request->user())
            ->withProperties(['role' => $request->role()->value])
            ->log('Updated staff account');

        $this->toast("{$user->name} saved.");

        return back();
    }

    /**
     * Deactivate instead of delete, so the staff member's history stays on every record.
     */
    public function toggleActive(Request $request, User $user): RedirectResponse
    {
        abort_if($user->hasRole(UserRole::Customer->value), 404);

        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => 'You cannot deactivate your own account.']);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $this->toast($user->is_active ? "{$user->name} reactivated." : "{$user->name} deactivated and can no longer log in.");

        return back();
    }
}
