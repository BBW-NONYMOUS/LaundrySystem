<?php

namespace App\Http\Requests;

use App\Enums\Permission;
use Illuminate\Foundation\Http\FormRequest;

class UpdateShopSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can(Permission::SettingsManage->value);
    }

    /**
     * Keys must match Setting::DEFAULTS.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'shop_name' => ['required', 'string', 'max:100'],
            'shop_address' => ['required', 'string', 'max:255'],
            'shop_phone' => ['required', 'string', 'max:30'],
            'shop_email' => ['nullable', 'email', 'max:255'],
            'currency_code' => ['required', 'string', 'size:3'],
            'currency_symbol' => ['required', 'string', 'max:5'],
            'express_surcharge_percent' => ['required', 'numeric', 'min:0', 'max:300'],
            'default_delivery_fee' => ['required', 'numeric', 'min:0', 'max:9999'],
            'unclaimed_after_days' => ['required', 'integer', 'min:1', 'max:365'],
            'reminder_interval_days' => ['required', 'integer', 'min:1', 'max:60'],
            'receipt_footer' => ['nullable', 'string', 'max:500'],
            'sms_enabled' => ['required', 'boolean'],
            'email_enabled' => ['required', 'boolean'],

            // Public website section ("sometimes" so the operational form can be saved on its own).
            'shop_tagline' => ['sometimes', 'nullable', 'string', 'max:120'],
            'shop_city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'business_hours' => ['sometimes', 'nullable', 'string', 'max:200'],
            'opening_hours_schema' => ['sometimes', 'nullable', 'string', 'max:200', 'regex:/^(\s*(Mo|Tu|We|Th|Fr|Sa|Su)(-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+\d{2}:\d{2}-\d{2}:\d{2}\s*,?)*$/'],
            'facebook_url' => ['sometimes', 'nullable', 'url:https', 'max:255'],
            'messenger_url' => ['sometimes', 'nullable', 'url:https', 'max:255'],
            'instagram_url' => ['sometimes', 'nullable', 'url:https', 'max:255'],
            // Only Google Maps embeds are allowed in the page's iframe.
            'map_embed_url' => ['sometimes', 'nullable', 'url:https', 'max:2000', 'starts_with:https://www.google.com/maps/embed'],
            'map_link' => ['sometimes', 'nullable', 'url:https', 'max:500'],
            'about_text' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'founded_year' => ['sometimes', 'nullable', 'integer', 'min:1950', 'max:'.now()->year],
            'service_area' => ['sometimes', 'nullable', 'string', 'max:200'],
            'pickup_slot_capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:50'],
        ];
    }
}
