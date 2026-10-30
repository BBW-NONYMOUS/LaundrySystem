<?php

namespace App\Http\Controllers\Public;

use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreFeedbackRequest;
use App\Models\Order;
use App\Models\Testimonial;
use App\Services\BookingService;
use App\Services\SeoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Rate us" page from the link in the order-completed SMS/email. One review per order;
 * nothing is public until the owner approves it.
 */
class FeedbackController extends Controller
{
    public function create(string $code, SeoService $seo): Response
    {
        $order = $this->findRateableOrder($code);

        return Inertia::render('public/feedback', [
            'order' => [
                'order_number' => $order->order_number,
                'tracking_code' => $order->tracking_code,
                'completed_at' => $order->completed_at?->toIso8601String(),
                'customer_first_name' => str($order->customer->name)->before(' ')->toString(),
            ],
            'alreadyRated' => $order->testimonial()->exists(),
            'formToken' => StoreFeedbackRequest::formToken(),
            // Personal link: keep it out of search engines.
            'seo' => [...$seo->page('Rate your laundry', 'Tell us how we did.'), 'noindex' => true],
        ]);
    }

    public function store(StoreFeedbackRequest $request, string $code, BookingService $inbox): RedirectResponse
    {
        $order = $this->findRateableOrder($code);

        if ($order->testimonial()->exists()) {
            throw ValidationException::withMessages(['rating' => 'You already rated this order. Thank you!']);
        }

        $testimonial = $order->testimonial()->create([
            'customer_id' => $order->customer_id,
            'author_name' => Testimonial::displayName($order->customer->name),
            'rating' => $request->integer('rating'),
            'comment' => $request->string('comment')->trim()->toString(),
            'source' => Testimonial::SOURCE_FEEDBACK,
            'is_approved' => false,
        ]);

        $inbox->notifyStaff(
            "New {$testimonial->rating}★ review",
            "{$testimonial->author_name} rated order {$order->order_number}. Approve it to show it on the website.",
            route('testimonials.index', absolute: false),
            Permission::WebsiteManage,
        );

        return to_route('public.feedback', $code);
    }

    private function findRateableOrder(string $code): Order
    {
        return Order::query()
            ->with('customer:id,name')
            ->where('tracking_code', strtoupper($code))
            ->whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered])
            ->firstOrFail();
    }
}
