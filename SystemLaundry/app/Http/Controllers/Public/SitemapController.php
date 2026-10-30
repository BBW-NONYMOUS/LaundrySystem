<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Service;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

/**
 * sitemap.xml and robots.txt, generated so they always use the real APP_URL and only list
 * public pages (admin, portal and personal tracking/feedback links are excluded).
 */
class SitemapController extends Controller
{
    public function sitemap(): Response
    {
        $xml = Cache::remember('public.sitemap', now()->addDay(), function () {
            // Pages change when prices, FAQs or shop details change.
            $contentUpdated = collect([
                Service::query()->max('updated_at'),
                Faq::query()->max('updated_at'),
                Setting::query()->max('updated_at'),
            ])->filter()->max();
            $lastmod = ($contentUpdated ? CarbonImmutable::parse((string) $contentUpdated) : now())->toDateString();

            $pages = [
                ['route' => 'home', 'priority' => '1.0', 'changefreq' => 'weekly'],
                ['route' => 'public.pricing', 'priority' => '0.9', 'changefreq' => 'weekly'],
                ['route' => 'public.book', 'priority' => '0.9', 'changefreq' => 'monthly'],
                ['route' => 'public.track', 'priority' => '0.8', 'changefreq' => 'monthly'],
                ['route' => 'public.faq', 'priority' => '0.6', 'changefreq' => 'monthly'],
                ['route' => 'public.about', 'priority' => '0.5', 'changefreq' => 'yearly'],
                ['route' => 'public.contact', 'priority' => '0.5', 'changefreq' => 'yearly'],
                ['route' => 'public.privacy', 'priority' => '0.2', 'changefreq' => 'yearly'],
            ];

            $urls = array_map(fn (array $page) => sprintf(
                "  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>",
                e(route($page['route'])),
                $lastmod,
                $page['changefreq'],
                $page['priority'],
            ), $pages);

            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
                .implode("\n", $urls)."\n</urlset>\n";
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function robots(): Response
    {
        $disallow = ['/dashboard', '/orders', '/customers', '/payments', '/deliveries', '/monitoring', '/services',
            '/inventory', '/reports', '/users', '/activity-log', '/settings', '/scan', '/rider', '/portal',
            '/booking-requests', '/contact-messages', '/website', '/search', '/track/', '/feedback/'];

        $lines = ['User-agent: *', 'Allow: /', ...array_map(fn (string $path) => "Disallow: {$path}", $disallow), '', 'Sitemap: '.route('sitemap')];

        return response(implode("\n", $lines)."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
