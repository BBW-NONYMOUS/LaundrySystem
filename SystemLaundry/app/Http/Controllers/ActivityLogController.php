<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Resources\ActivityResource;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Audit trail: who changed prices, voided payments, edited orders...
 */
class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Activity::query()->with(['causer', 'subject'])->latest()->latest('id');

        if ($request->filled('log')) {
            $query->where('log_name', $request->string('log')->toString());
        }

        if ($request->filled('user')) {
            $query->where('causer_type', (new User)->getMorphClass())->where('causer_id', $request->integer('user'));
        }

        if ($request->filled('search')) {
            $query->where('description', 'like', '%'.$request->string('search')->toString().'%');
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from')?->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')?->endOfDay());
        }

        return Inertia::render('activity-log/index', [
            'activities' => ActivityResource::collection($query->paginate($this->perPage($request, 25))->withQueryString()),
            'filters' => $this->filters($request, ['log', 'user', 'search', 'from', 'to']),
            'logNames' => Activity::query()->whereNotNull('log_name')->distinct()->orderBy('log_name')->pluck('log_name'),
            'users' => User::query()
                ->whereDoesntHave('roles', fn ($roles) => $roles->where('name', UserRole::Customer->value))
                ->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
