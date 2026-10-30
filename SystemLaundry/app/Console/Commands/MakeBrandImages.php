<?php

namespace App\Console\Commands;

use App\Services\BrandImageService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Run once after deploying (and after replacing the logo colors) to refresh the
 * link-preview image and icons. Shop settings changes refresh the og-image automatically.
 */
#[Signature('laundry:brand-images')]
#[Description('Generate the Facebook link-preview image, favicon and home-screen icon')]
class MakeBrandImages extends Command
{
    public function handle(BrandImageService $images): int
    {
        $images->generateAll();

        $this->info('Created public/images/og-image.jpg, public/apple-touch-icon.png and public/favicon.ico.');

        return self::SUCCESS;
    }
}
