<?php

namespace App\Http\Controllers\Public;

use App\Enums\PricingUnit;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Models\Setting;
use App\Services\SeoService;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Services & Pricing, read live from the services table so the owner's price changes
 * show immediately.
 */
class PricingController extends Controller
{
    public function __invoke(SeoService $seo): Response
    {
        $services = Service::query()->active()->get();
        $cheapestPerKilo = $services->filter(fn (Service $service) => $service->pricing_unit === PricingUnit::PerKg)->min('price');

        return Inertia::render('public/pricing', [
            'services' => ServiceResource::collection($services),
            'pricing' => HomeController::pricingRules(),
            'seo' => $seo->page(
                'Services & Pricing',
                'Laundry prices '.($cheapestPerKilo ? 'from '.Setting::get('currency_symbol', '₱').number_format((float) $cheapestPerKilo, 0).' per kilo' : 'per kilo and per piece')
                    .'. Wash, dry & fold, ironing, comforters, dry cleaning and express service in '.Setting::get('shop_city').'.',
            ),
        ]);
    }
}
