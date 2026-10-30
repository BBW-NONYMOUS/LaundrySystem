<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Website\UploadLogoRequest;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/**
 * Shop logo shown on the website and receipts. Stored on the "public" disk
 * (run `php artisan storage:link` once so /storage URLs work).
 */
class ShopLogoController extends Controller
{
    public function store(UploadLogoRequest $request): RedirectResponse
    {
        $this->deleteCurrent();

        $path = $request->file('logo')?->store('branding', 'public');
        Setting::set('logo_path', $path ?: '');

        $this->toast('Logo updated.');

        return back();
    }

    public function destroy(): RedirectResponse
    {
        $this->deleteCurrent();
        Setting::set('logo_path', '');

        $this->toast('Logo removed.');

        return back();
    }

    private function deleteCurrent(): void
    {
        $current = Setting::get('logo_path');

        if ($current) {
            Storage::disk('public')->delete($current);
        }
    }
}
