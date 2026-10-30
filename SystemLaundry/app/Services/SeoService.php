<?php

namespace App\Services;

use App\Models\Faq;
use App\Models\Setting;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Title, description, Open Graph and JSON-LD for public pages.
 *
 * The result is passed as the `seo` page prop. resources/views/app.blade.php prints it into
 * the HTML (so Facebook and other crawlers that don't run JavaScript see it), and the React
 * <SeoHead> renders the same tags with the same keys, so nothing is duplicated or removed.
 */
class SeoService
{
    /**
     * @param  list<array<string, mixed>>  $extraJsonLd
     * @return array{title: string, description: string, url: string, image: string, type: string, site_name: string, json_ld: list<array<string, mixed>>}
     */
    public function page(string $title, string $description, array $extraJsonLd = [], string $type = 'website'): array
    {
        $siteName = (string) Setting::get('shop_name', config()->string('app.name'));

        return [
            'title' => $title === $siteName ? $siteName : "{$title} | {$siteName}",
            'description' => Str::limit($description, 160),
            'url' => url()->current(),
            'image' => asset('images/og-image.jpg'),
            'type' => $type,
            'site_name' => $siteName,
            'json_ld' => [$this->localBusiness(), ...$extraJsonLd],
        ];
    }

    /**
     * schema.org LocalBusiness (DryCleaningOrLaundry) for local search results.
     *
     * @return array<string, mixed>
     */
    public function localBusiness(): array
    {
        [$locality, $region] = array_pad(array_map('trim', explode(',', (string) Setting::get('shop_city'), 2)), 2, null);

        return array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'DryCleaningOrLaundry',
            'name' => Setting::get('shop_name'),
            'description' => Setting::get('shop_tagline'),
            'url' => url('/'),
            'image' => asset('images/og-image.jpg'),
            'telephone' => Setting::get('shop_phone'),
            'email' => Setting::get('shop_email') ?: null,
            'priceRange' => '₱₱',
            'address' => array_filter([
                '@type' => 'PostalAddress',
                'streetAddress' => Setting::get('shop_address'),
                'addressLocality' => $locality,
                'addressRegion' => $region,
                'addressCountry' => 'PH',
            ]),
            // e.g. "Mo-Sa 07:00-20:00, Su 08:00-17:00"
            'openingHours' => array_values(array_filter(array_map('trim', explode(',', (string) Setting::get('opening_hours_schema'))))),
            'sameAs' => array_values(array_filter([Setting::get('facebook_url'), Setting::get('instagram_url')])),
        ], fn ($value) => $value !== null && $value !== [] && $value !== '');
    }

    /**
     * schema.org FAQPage so questions can appear directly in Google results.
     *
     * @param  Collection<int, Faq>  $faqs
     * @return array<string, mixed>
     */
    public function faqPage(Collection $faqs): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => $faqs->map(fn (Faq $faq) => [
                '@type' => 'Question',
                'name' => $faq->question,
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq->answer],
            ])->values()->all(),
        ];
    }
}
