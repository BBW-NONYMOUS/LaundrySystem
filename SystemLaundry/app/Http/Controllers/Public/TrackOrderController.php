<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\TrackOrderRequest;
use App\Models\Customer;
use App\Models\Order;
use App\Services\SeoService;
use App\Support\PublicOrderSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public order lookup by order number + mobile number (both must match).
 */
class TrackOrderController extends Controller
{
    /** Failed tries allowed per order number before it is locked for 15 minutes. */
    private const MAX_FAILURES = 5;

    private const LOCK_SECONDS = 900;

    private const NOT_FOUND = 'We couldn’t find an order with that order number and mobile number. Please check your receipt and try again.';

    public function create(Request $request, SeoService $seo): Response
    {
        return Inertia::render('public/track', [
            'orderNumber' => $request->string('order')->limit(30, '')->toString(),
            'seo' => $seo->page('Track Your Order', 'Check your laundry’s status with your order number and mobile number — no account needed.'),
        ]);
    }

    /**
     * On a match: the Home quick tracker gets the result inline (flash); the Track page goes
     * to the full /track/{code} page. Every mismatch gets the same message, so nobody can
     * learn whether an order number exists.
     */
    public function store(TrackOrderRequest $request): RedirectResponse
    {
        $number = $request->string('order_number')->toString();
        $limiterKey = 'track-failures:'.$number;

        if (RateLimiter::tooManyAttempts($limiterKey, self::MAX_FAILURES)) {
            $minutes = (int) ceil(RateLimiter::availableIn($limiterKey) / 60);

            throw ValidationException::withMessages([
                'order_number' => "Too many attempts for this order number. Please try again in {$minutes} minutes or call us.",
            ]);
        }

        // Full customer: the inline result needs the first name, not only the phone to compare.
        $order = Order::query()->with('customer')->where('order_number', $number)->first();
        $phone = Customer::normalizePhone($request->string('phone')->toString());

        if ($order === null || ! hash_equals((string) $order->customer->phone, (string) $phone)) {
            RateLimiter::hit($limiterKey, self::LOCK_SECONDS);

            throw ValidationException::withMessages(['order_number' => self::NOT_FOUND]);
        }

        RateLimiter::clear($limiterKey);

        if ($request->boolean('inline')) {
            Inertia::flash('trackedOrder', PublicOrderSummary::make($order));

            return back();
        }

        return to_route('tracking.show', $order->tracking_code);
    }
}
