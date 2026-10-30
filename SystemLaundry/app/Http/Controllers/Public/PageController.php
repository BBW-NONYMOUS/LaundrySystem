<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreContactMessageRequest;
use App\Models\Faq;
use App\Models\Setting;
use App\Models\Testimonial;
use App\Services\SeoService;
use App\Support\PublicStats;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Mostly-static public pages whose content lives in Settings and the FAQ table.
 */
class PageController extends Controller
{
    /** Change this date whenever the privacy notice text changes. */
    private const PRIVACY_UPDATED = '2026-10-23';

    public function __construct(private SeoService $seo) {}

    public function about(): Response
    {
        return Inertia::render('public/about', [
            'about' => [
                'story' => Setting::get('about_text'),
                'founded_year' => Setting::int('founded_year') ?: null,
                'service_area' => Setting::get('service_area'),
            ],
            'stats' => PublicStats::get(),
            'testimonials' => Testimonial::query()->forWebsite()->limit(3)->get()->map(fn (Testimonial $testimonial) => $testimonial->publicData()),
            'seo' => $this->seo->page('About Us', 'Meet '.Setting::get('shop_name').' — a neighborhood laundry shop in '.Setting::get('shop_city').' that tags, tracks and texts every order.'),
        ]);
    }

    public function faq(): Response
    {
        $faqs = Faq::query()->published()->get(['id', 'question', 'answer', 'category']);

        return Inertia::render('public/faq', [
            'faqs' => $faqs,
            'categories' => $faqs->pluck('category')->unique()->values(),
            'seo' => $this->seo->page(
                'Frequently Asked Questions',
                'Turnaround times, prices, pickup and delivery, payments and garment care — answers to common laundry questions.',
                [$this->seo->faqPage($faqs)],
            ),
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('public/contact', [
            'mapEmbedUrl' => Setting::get('map_embed_url') ?: null,
            'formToken' => StoreContactMessageRequest::formToken(),
            'seo' => $this->seo->page('Contact Us', 'Call, message or visit '.Setting::get('shop_name').' in '.Setting::get('shop_city').'. '.Setting::get('business_hours').'.'),
        ]);
    }

    /**
     * Data Privacy Act (RA 10173) notice linked from the booking and contact consent boxes.
     */
    public function privacy(): Response
    {
        $name = (string) Setting::get('shop_name');

        return Inertia::render('public/privacy', [
            'lastUpdated' => self::PRIVACY_UPDATED,
            'retentionMonths' => 12,
            'seo' => $this->seo->page('Privacy Notice', "How {$name} collects, uses and protects your personal information."),
        ]);
    }
}
