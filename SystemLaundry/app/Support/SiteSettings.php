<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Storage;

/**
 * Business details that are safe to show on public pages (navbar, footer, contact,
 * error pages). Shared to every Inertia page as the `site` prop.
 */
class SiteSettings
{
    /**
     * @return array<string, string|list<string>|null>
     */
    public static function shared(): array
    {
        $logo = Setting::get('logo_path');

        return [
            'name' => Setting::get('shop_name'),
            'tagline' => Setting::get('shop_tagline'),
            'phone' => Setting::get('shop_phone'),
            'email' => Setting::get('shop_email'),
            'address' => Setting::get('shop_address'),
            'city' => Setting::get('shop_city'),
            'hours' => Setting::get('business_hours'),
            // schema.org format, e.g. "Mo-Sa 07:00-20:00, Su 08:00-17:00" (drives the "Open now" badge).
            'opening_hours' => Setting::get('opening_hours_schema'),
            'service_area' => Setting::get('service_area'),
            'facebook_url' => Setting::get('facebook_url') ?: null,
            'messenger_url' => Setting::get('messenger_url') ?: null,
            'instagram_url' => Setting::get('instagram_url') ?: null,
            'map_link' => Setting::get('map_link') ?: null,
            'logo_url' => $logo ? Storage::disk('public')->url($logo) : null,
            'currency_symbol' => Setting::get('currency_symbol', '₱'),
            'images' => self::photos(),
        ];
    }

    /**
     * Photos the owner has saved in public/images/site (e.g. ["hero", "team"]). Pages show a
     * branded panel instead of requesting a file that isn't there (docs/public-site/04 §16).
     *
     * @return list<string>
     */
    public static function photos(): array
    {
        $files = glob(public_path('images/site/*.webp')) ?: [];

        return array_map(fn (string $file) => pathinfo($file, PATHINFO_FILENAME), $files);
    }
}
