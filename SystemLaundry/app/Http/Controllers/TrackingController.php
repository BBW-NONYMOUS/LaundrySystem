<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Setting;
use App\Services\SeoService;
use App\Support\PublicOrderSummary;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public order tracking from the SMS/email link. Uses the random tracking code (never the
 * guessable order number) and exposes no staff names, phone numbers or addresses.
 */
class TrackingController extends Controller
{
    public function show(string $code, SeoService $seo): Response
    {
        $order = Order::query()->where('tracking_code', strtoupper($code))->firstOrFail();

        return Inertia::render('track/show', [
            'order' => PublicOrderSummary::make($order),
            'shop' => [
                'name' => Setting::get('shop_name'),
                'address' => Setting::get('shop_address'),
                'phone' => Setting::get('shop_phone'),
                'currency_symbol' => Setting::get('currency_symbol', '₱'),
            ],
            // Personal link: keep it out of search engines.
            'seo' => [...$seo->page("Order {$order->order_number}", 'Laundry order status.'), 'noindex' => true],
        ]);
    }
}
