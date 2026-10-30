<?php

namespace App\Http\Controllers;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Enums\UserRole;
use App\Http\Requests\Deliveries\ScheduleDeliveryRequest;
use App\Http\Requests\Deliveries\UpdateDeliveryRequest;
use App\Http\Resources\DeliveryResource;
use App\Http\Resources\UserSummaryResource;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;
use App\Services\DeliveryService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pickup and delivery scheduling board for the counter (feature: scheduling + rider assignment).
 */
class DeliveryController extends Controller
{
    public function index(Request $request): Response
    {
        $date = $request->filled('date') ? CarbonImmutable::parse($request->string('date')->toString()) : CarbonImmutable::today();

        $query = Delivery::query()
            ->with(['order.customer:id,name,phone', 'rider:id,name,phone'])
            ->whereBetween('scheduled_at', [$date->startOfDay(), $date->endOfDay()])
            ->orderBy('scheduled_at');

        if (DeliveryType::tryFrom($request->string('type')->toString()) !== null) {
            $query->where('type', $request->string('type')->toString());
        }

        if (DeliveryStatus::tryFrom($request->string('status')->toString()) !== null) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->string('rider')->toString() === 'unassigned') {
            $query->whereNull('rider_id');
        } elseif ($request->filled('rider')) {
            $query->where('rider_id', $request->integer('rider'));
        }

        return Inertia::render('deliveries/index', [
            'date' => $date->toDateString(),
            'deliveries' => DeliveryResource::collection($query->get()),
            // Trips from earlier days that never happened still need attention.
            'overdueTrips' => DeliveryResource::collection(
                Delivery::query()->pending()->where('scheduled_at', '<', CarbonImmutable::today())
                    ->with(['order.customer:id,name,phone', 'rider:id,name'])->orderBy('scheduled_at')->get(),
            ),
            'riders' => UserSummaryResource::collection(User::withActiveRole(UserRole::Rider)->orderBy('name')->get()),
            'filters' => $this->filters($request, ['type', 'status', 'rider']),
            'options' => [
                'types' => array_map(fn (DeliveryType $type) => ['value' => $type->value, 'label' => $type->label()], DeliveryType::cases()),
                'statuses' => array_map(fn (DeliveryStatus $status) => ['value' => $status->value, 'label' => $status->label(), 'color' => $status->color()], DeliveryStatus::cases()),
            ],
        ]);
    }

    public function store(ScheduleDeliveryRequest $request, Order $order, DeliveryService $deliveries): RedirectResponse
    {
        $delivery = $deliveries->schedule(
            order: $order,
            type: $request->type(),
            scheduledAt: CarbonImmutable::parse($request->string('scheduled_at')->toString()),
            address: $request->string('address')->toString(),
            contactPhone: $request->string('contact_phone')->toString(),
            rider: $request->filled('rider_id') ? User::query()->findOrFail($request->integer('rider_id')) : null,
            actor: $request->user(),
            notes: $request->input('notes'),
        );

        $this->toast("{$delivery->type->label()} scheduled for {$delivery->scheduled_at->format('M j, g:i A')}.");

        return back();
    }

    /**
     * Reschedule and/or (re)assign a rider. A failed trip becomes Scheduled again.
     */
    public function update(UpdateDeliveryRequest $request, Delivery $delivery, DeliveryService $deliveries): RedirectResponse
    {
        $data = $request->validated();

        if (array_keys($data) === ['rider_id'] && $request->filled('rider_id')) {
            $deliveries->assign($delivery, User::query()->findOrFail($request->integer('rider_id')), $request->user());
        } else {
            $riderId = array_key_exists('rider_id', $data) ? $request->integer('rider_id') : $delivery->rider_id;

            $deliveries->schedule(
                order: $delivery->order,
                type: $delivery->type,
                scheduledAt: CarbonImmutable::parse($data['scheduled_at'] ?? $delivery->scheduled_at),
                address: $data['address'] ?? $delivery->address,
                contactPhone: $data['contact_phone'] ?? $delivery->contact_phone,
                rider: $riderId ? User::query()->findOrFail($riderId) : null,
                actor: $request->user(),
                notes: array_key_exists('notes', $data) ? $data['notes'] : $delivery->notes,
            );
        }

        $this->toast('Trip updated.');

        return back();
    }
}
