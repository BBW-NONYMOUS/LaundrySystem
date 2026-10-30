<?php

namespace App\Support;

use App\Enums\OrderStatus;
use App\Enums\PricingUnit;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Testimonial;
use Illuminate\Support\Facades\Cache;

/**
 * Real numbers for the website trust bar, cached for an hour so the Home page stays fast.
 */
class PublicStats
{
    public const CACHE_KEY = 'public.stats';

    /**
     * @return array{orders_completed: int, customers: int, years_in_service: int, fastest_express_hours: int|null, reviews_count: int, average_rating: float|null}
     */
    public static function get(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addHour(), fn () => [
            ...self::reviews(),
            'orders_completed' => Order::query()->whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered])->count(),
            'customers' => Customer::query()->count(),
            'years_in_service' => max(now()->year - (Setting::int('founded_year') ?: now()->year), 1),
            // Laundry by the kilo only: the site promises "wash, dry & fold in as little as X hours",
            // so a faster per-piece service (ironing) must not set this number.
            'fastest_express_hours' => Service::query()->where('is_active', true)->where('pricing_unit', PricingUnit::PerKg)->min('express_turnaround_hours'),
        ]);
    }

    /**
     * Rating summary of the reviews shown on the website (the hero shows it from 5 reviews up).
     *
     * @return array{reviews_count: int, average_rating: float|null}
     */
    private static function reviews(): array
    {
        $approved = Testimonial::query()->where('is_approved', true);
        $count = (clone $approved)->count();

        return [
            'reviews_count' => $count,
            'average_rating' => $count > 0 ? round((float) $approved->avg('rating'), 1) : null,
        ];
    }
}
