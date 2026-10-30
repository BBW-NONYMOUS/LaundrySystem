<?php

namespace App\Http\Controllers\Public;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreBookingRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\BookingService;
use App\Services\SeoService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Guest "Book a Pickup". Signed-in customers use the portal booking instead, which skips
 * the confirmation step because their mobile number is already verified.
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
            'services' => ServiceResource::collection(Service::query()->active()->get()),
            'pricing' => HomeController::pricingRules(),
            'dates' => $dates,
            'selectedDate' => $date->toDateString(),
            'slots' => $bookings->availability($date),
            'formToken' => StoreBookingRequest::formToken(),
            'seo' => $seo->page('Book a Pickup', 'Schedule a laundry pickup online in under a minute. Choose a time slot and our rider collects your laundry at your door.'),
        ]);
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
