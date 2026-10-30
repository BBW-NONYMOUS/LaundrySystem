<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Production Owner Account
    |--------------------------------------------------------------------------
    |
    | In production, UserSeeder creates only this owner account. Set a strong
    | SEED_ADMIN_PASSWORD before running `php artisan db:seed --force`; if it
    | is empty a random password is generated and must be reset by email.
    |
    */

    'seed_admin' => [
        'email' => env('SEED_ADMIN_EMAIL') ?: 'admin@laundry.test',
        'password' => env('SEED_ADMIN_PASSWORD'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Brand Images
    |--------------------------------------------------------------------------
    |
    | Regenerate public/images/og-image.jpg (the Facebook link preview) when
    | the shop name, tagline, city or phone changes in Settings. Turned off in
    | tests so test data never overwrites the real image.
    |
    */

    'auto_brand_images' => (bool) env('LAUNDRY_AUTO_BRAND_IMAGES', true),

];
