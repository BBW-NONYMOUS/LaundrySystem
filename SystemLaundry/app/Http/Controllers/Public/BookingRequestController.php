<?php

namespace App\Http\Controllers\Public;

use App\Enums\Permission;
use App\Enums\PickupSlot;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreBookingRequest;
use App\Services\BookingService;
use App\Services\SeoService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Guest "Book a Pickup": guests pick a day and time here, then log in or register and finish
 * in the portal booking, which uses the details on their account. Signed-in customers go
 * straight to the portal booking.
 */
class BookingRequestController extends Controller
{
    public function create(Request $request, BookingService $bookings, SeoService $seo): Response|RedirectResponse
    {
        if ($request->user()?->can(Permission::PortalAccess->value)) {
            return to_route('portal.bookings.create');
        }

        $dates = $bookings->bookableDates();
        // Partial reloads ask for another day's slots with ?date=YYYY-MM-DD.
        $requested = $request->date('date');
        $date = $requested !== null && collect($dates)->contains('date', $requested->toDateString())
            ? CarbonImmutable::parse($requested->toDateString())
            : CarbonImmutable::parse(collect($dates)->firstWhere('available', true)['date'] ?? $dates[0]['date']);

        return Inertia::render('public/book', [
            'dates' => $dates,
            'selectedDate' => $date->toDateString(),
            'slots' => $bookings->availability($date),
            'seo' => $seo->page('Book a Pickup', 'Schedule a laundry pickup online in under a minute. Choose a time slot and our rider collects your laundry at your door.'),
        ]);
    }

    /**
     * "Log in to book" / "Create an account": remember the portal booking (with the chosen
     * day and time) as the page to land on after signing in, then go sign in.
     */
    public function proceed(Request $request): RedirectResponse
    {
        $chosen = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'slot' => ['nullable', Rule::enum(PickupSlot::class)],
            'to' => ['nullable', 'in:register'],
        ]);
        $booking = route('portal.bookings.create', Arr::only(array_filter($chosen), ['date', 'slot']));

        if ($request->user() !== null) {
            return redirect($booking);
        }

        redirect()->setIntendedUrl($booking);

        return to_route(($chosen['to'] ?? null) === 'register' ? 'register' : 'login');
    }

    public function store(StoreBookingRequest $request, BookingService $bookings): RedirectResponse
    {
        $booking = $bookings->create($request->bookingData(), $request->ip());

        // The page shows a confirmation dialog with the reference number.
        Inertia::flash('booking', [
            'reference' => $booking->reference,
            'name' => $booking->name,
            'date' => $booking->pickup_date->format('l, F j'),
            'window' => $booking->time_slot->window(),
            'phone' => $booking->phone,
        ]);

        return to_route('public.book');
    }
}
