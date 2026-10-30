<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Key/value shop settings (express surcharge, unclaimed days, shop info...).
 *
 * @property int $id
 * @property string $key
 * @property string|null $value
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['key', 'value'])]
class Setting extends Model
{
    private const CACHE_KEY = 'settings.all';

    /**
     * Default values, also used by SettingSeeder.
     *
     * @var array<string, string>
     */
    public const DEFAULTS = [
        'shop_name' => 'Fresh Fold Laundry',
        'shop_address' => '123 Rizal Street, Barangay Poblacion',
        'shop_phone' => '09171234567',
        'shop_email' => 'hello@freshfold.test',
        'currency_code' => 'PHP',
        'currency_symbol' => '₱',
        'express_surcharge_percent' => '50',
        'default_delivery_fee' => '50',
        'unclaimed_after_days' => '7',
        'reminder_interval_days' => '3',
        'receipt_footer' => 'Unclaimed items after 30 days are not the responsibility of the shop. Thank you!',
        'sms_enabled' => '1',
        'email_enabled' => '1',

        // Public website (docs/public-site/02-database.md). Sample values — edit in Settings.
        'shop_tagline' => 'Fresh, clean, and on time.',
        'shop_city' => 'Quezon City, Metro Manila',
        'business_hours' => 'Mon–Sat 7:00 AM – 8:00 PM · Sun 8:00 AM – 5:00 PM',
        // Same hours in schema.org format for Google (comma-separated).
        'opening_hours_schema' => 'Mo-Sa 07:00-20:00, Su 08:00-17:00',
        'facebook_url' => 'https://www.facebook.com/freshfoldlaundry',
        'messenger_url' => 'https://m.me/freshfoldlaundry',
        'instagram_url' => '',
        // Google Maps "Embed a map" src URL; leave empty to hide the map.
        'map_embed_url' => '',
        'map_link' => 'https://maps.google.com/?q=Fresh+Fold+Laundry',
        'about_text' => 'Fresh Fold Laundry started as a two-machine shop for busy neighbors who needed clean clothes without losing their weekend. Today we wash, dry, fold and press for students, families and working professionals — with every order tagged, tracked and texted to you, so nothing gets lost and you always know when your laundry is ready.',
        'founded_year' => '2019',
        'service_area' => 'Pickup and delivery within 5 km of the shop',
        // Pickups the riders can handle per time slot (9 AM / 1 PM / 4 PM).
        'pickup_slot_capacity' => '4',
        'logo_path' => '',
    ];

    protected static function booted(): void
    {
        // Any write invalidates the cached settings map.
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /**
     * @return array<string, string|null>
     */
    public static function allValues(): array
    {
        // Cache only the saved rows; defaults are merged on read so keys added in a later
        // release work immediately on an existing install (no cache clear needed).
        $saved = Cache::rememberForever(self::CACHE_KEY, fn () => static::query()->pluck('value', 'key')->all());

        return $saved + self::DEFAULTS;
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        return static::allValues()[$key] ?? $default;
    }

    public static function float(string $key): float
    {
        return (float) static::get($key, '0');
    }

    public static function int(string $key): int
    {
        return (int) static::get($key, '0');
    }

    public static function bool(string $key): bool
    {
        return filter_var(static::get($key, '0'), FILTER_VALIDATE_BOOL);
    }

    public static function set(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
