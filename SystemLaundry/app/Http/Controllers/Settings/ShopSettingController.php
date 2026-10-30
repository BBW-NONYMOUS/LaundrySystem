<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateShopSettingsRequest;
use App\Models\Setting;
use App\Services\BrandImageService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Shop profile, pricing rules (express %, delivery fee), reminder timing and notification switches.
 */
class ShopSettingController extends Controller
{
    public function edit(): Response
    {
        $values = Setting::allValues();

        return Inertia::render('settings/shop', [
            'settings' => [
                ...$values,
                'sms_enabled' => Setting::bool('sms_enabled'),
                'email_enabled' => Setting::bool('email_enabled'),
            ],
            'smsDriver' => config('services.sms.driver'),
        ]);
    }

    public function update(UpdateShopSettingsRequest $request, BrandImageService $images): RedirectResponse
    {
        $before = Setting::allValues();
        $changes = ['attributes' => [], 'old' => []];

        foreach ($request->validated() as $key => $value) {
            $value = is_bool($value) ? ($value ? '1' : '0') : (string) $value;

            if (($before[$key] ?? null) !== $value) {
                Setting::set($key, $value);
                $changes['attributes'][$key] = $value;
                $changes['old'][$key] = $before[$key] ?? null;
            }
        }

        // Settings are key/value rows, so log one combined entry for the audit trail.
        if ($changes['attributes'] !== []) {
            activity('settings')->causedBy($request->user())->event('updated')
                ->withChanges($changes)->log('Updated shop settings');
        }

        // Keep the Facebook link preview in step with the shop name and tagline.
        if (config()->boolean('laundry.auto_brand_images') && array_intersect(BrandImageService::OG_SETTINGS, array_keys($changes['attributes'])) !== []) {
            try {
                $images->ogImage();
            } catch (Throwable $exception) {
                report($exception);
            }
        }

        $this->toast('Settings saved.');

        return back();
    }
}
