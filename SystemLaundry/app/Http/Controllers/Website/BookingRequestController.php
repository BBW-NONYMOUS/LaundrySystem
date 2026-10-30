<?php

namespace App\Http\Controllers\Website;

use App\Enums\BookingStatus;
use App\Enums\PickupSlot;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Website\CloseBookingRequest;
use App\Http\Requests\Website\ConfirmBookingRequest;
use App\Http\Resources\BookingRequestResource;
use App\Http\Resources\UserSummaryResource;
use App\Models\BookingRequest;
use App\Models\User;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff inbox for pickup requests made on the public website.
 */
class BookingRequestController extends Controller
{
    public function index(Request $request): Response
    {
        $status = BookingStatus::tryFrom($request->string('status')->toString()) ?? BookingStatus::Pending;

        $query = BookingRequest::query()
            ->where('status', $status)
            ->with(['service', 'customer' => fn ($customers) => $customers->withCount('orders'), 'order', 'handler:id,name']);

        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(fn (Builder $query) => $query
                ->where('reference', 'like', "%{$search}%")
                ->orWhere('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', '%'.preg_replace('/\D+/', '', $search).'%'));
        }

        // Pending: soonest pickup first. Handled: most recently handled first.
        if ($status === BookingStatus::Pending) {
            $query->orderBy('pickup_date')->orderBy('time_slot')->orderBy('id');
        } else {
            $query->latest('handled_at')->latest('id');
        }

        return Inertia::render('website/booking-requests/index', [
            'bookings' => BookingRequestResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => [...$this->filters($request, ['search']), 'status' => $status->value],
            'counts' => BookingRequest::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'riders' => UserSummaryResource::collection(User::withActiveRole(UserRole::Rider)->orderBy('name')->get()),
            'slots' => array_map(fn (PickupSlot $slot) => ['value' => $slot->value, 'label' => $slot->label()], PickupSlot::cases()),
        ]);
    }

    public function confirm(ConfirmBookingRequest $request, BookingRequest $booking, BookingService $bookings): RedirectResponse
    {
        $order = $bookings->confirm(
            booking: $booking,
            actor: $request->user(),
            rider: $request->rider(),
            pickupDate: $request->filled('pickup_date') ? CarbonImmutable::parse($request->string('pickup_date')->toString()) : null,
            slot: $request->filled('time_slot') ? PickupSlot::from($request->string('time_slot')->toString()) : null,
        );

        $this->toast("Confirmed. Order {$order->order_number} created and the customer was notified.");

        return back();
    }

    public function decline(CloseBookingRequest $request, BookingRequest $booking, BookingService $bookings): RedirectResponse
    {
        $bookings->decline($booking, $request->user(), $request->string('reason')->toString());

        $this->toast('Request declined. The customer was notified.');

        return back();
    }

    public function cancel(CloseBookingRequest $request, BookingRequest $booking, BookingService $bookings): RedirectResponse
    {
        $bookings->cancel($booking, $request->user(), $request->string('reason')->toString());

        $this->toast('Request cancelled.');

        return back();
    }
}
