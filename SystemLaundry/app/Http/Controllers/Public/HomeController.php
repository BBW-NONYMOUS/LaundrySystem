<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Faq;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Testimonial;
use App\Services\SeoService;
use App\Support\PublicStats;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(SeoService $seo): Response
    {
        $tagline = (string) Setting::get('shop_tagline');

        return Inertia::render('public/home', [
            'services' => ServiceResource::collection(Service::query()->active()->get()),
            'pricing' => self::pricingRules(),
            'stats' => PublicStats::get(),
            'testimonials' => Testimonial::query()->forWebsite()->limit(9)->get()->map(fn (Testimonial $testimonial) => $testimonial->publicData()),
            'faqs' => Faq::query()->forHome()->get(['id', 'question', 'answer']),
            'seo' => $seo->page(
                (string) Setting::get('shop_name'),
                "{$tagline} Wash, dry & fold, ironing and dry cleaning with free SMS updates, online order tracking, and pickup & delivery in ".Setting::get('shop_city').'.',
            ),
        ]);
    }

    /**
     * Pricing notes shared by Home and the Pricing page.
     *
     * @return array{express_surcharge_percent: float, delivery_fee_per_trip: float, currency_symbol: string|null, service_area: string|null}
     */
    public static function pricingRules(): array
    {
        return [
            'express_surcharge_percent' => Setting::float('express_surcharge_percent'),
            'delivery_fee_per_trip' => Setting::float('default_delivery_fee'),
            'currency_symbol' => Setting::get('currency_symbol', '₱'),
            'service_area' => Setting::get('service_area'),
        ];
    }
}
