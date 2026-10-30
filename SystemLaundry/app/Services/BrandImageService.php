<?php

namespace App\Services;

use App\Models\Setting;
use GdImage;
use RuntimeException;

/**
 * Draws the brand images with PHP GD (no design tool needed):
 *  - public/images/og-image.jpg   1200×630 link preview for Facebook / Messenger
 *  - public/apple-touch-icon.png  180×180 home-screen icon
 *  - public/favicon.ico           16 + 32 px browser-tab icon
 *
 * The og-image is regenerated when the shop name, tagline, city or phone changes.
 */
class BrandImageService
{
    /** Laundry Blue and Fresh Aqua as sRGB (oklch 0.52 0.17 252 / 0.8 0.11 205). */
    private const BLUE = [0, 105, 198];

    private const BLUE_DARK = [0, 74, 156];

    private const AQUA = [86, 210, 223];

    /** Settings that appear on the og-image. */
    public const OG_SETTINGS = ['shop_name', 'shop_tagline', 'shop_city', 'shop_phone'];

    public function generateAll(): void
    {
        $this->ogImage();
        $this->appleTouchIcon();
        $this->favicon();
    }

    public function ogImage(): string
    {
        $width = 1200;
        $height = 630;
        $image = $this->canvas($width, $height);

        // Diagonal blue gradient with two soft aqua glows.
        for ($x = 0; $x < $width; $x++) {
            $color = $this->color($image, $this->mix(self::BLUE, self::BLUE_DARK, $x / $width));
            imageline($image, $x, 0, $x, $height, $color);
        }
        $this->glow($image, 1080, 90, 260, self::AQUA);
        $this->glow($image, 140, 600, 200, self::AQUA);

        $white = $this->color($image, [255, 255, 255]);
        $soft = $this->color($image, [214, 236, 255]);

        $this->drawMark($image, 96, 96, 112, light: true);

        $bold = $this->font('DejaVuSans-Bold.ttf');
        $regular = $this->font('DejaVuSans.ttf');

        $name = (string) Setting::get('shop_name', config()->string('app.name'));
        $tagline = (string) Setting::get('shop_tagline');
        $city = trim(explode(',', (string) Setting::get('shop_city'))[0]);
        $phone = $this->formatPhone((string) Setting::get('shop_phone'));

        $y = 330;
        foreach ($this->wrap($name, $bold, 64, 1000) as $line) {
            imagettftext($image, 64, 0, 96, $y, $white, $bold, $line);
            $y += 84;
        }

        foreach ($this->wrap($tagline, $regular, 32, 1000) as $line) {
            imagettftext($image, 32, 0, 96, $y - 10, $soft, $regular, $line);
            $y += 48;
        }

        $footer = implode('  ·  ', array_filter([
            'Pickup & delivery'.($city !== '' ? " in {$city}" : ''),
            'SMS updates',
            $phone,
        ]));
        imagettftext($image, 24, 0, 96, 560, $white, $regular, $footer);

        $path = public_path('images/og-image.jpg');
        $this->ensureDirectory($path);
        imagejpeg($image, $path, 85);

        return $path;
    }

    public function appleTouchIcon(): string
    {
        $path = public_path('apple-touch-icon.png');
        imagepng($this->icon(180, rounded: false), $path, 9);

        return $path;
    }

    /**
     * ICO file holding 16 px and 32 px PNG images (supported by every current browser).
     */
    public function favicon(): string
    {
        $images = array_map(function (int $size) {
            ob_start();
            imagepng($this->icon($size, rounded: true), null, 9);

            return [$size, (string) ob_get_clean()];
        }, [16, 32]);

        $header = pack('vvv', 0, 1, count($images));
        $directory = '';
        $data = '';
        $offset = 6 + 16 * count($images);

        foreach ($images as [$size, $png]) {
            $directory .= pack('CCCCvvVV', $size, $size, 0, 0, 1, 32, strlen($png), $offset);
            $data .= $png;
            $offset += strlen($png);
        }

        $path = public_path('favicon.ico');
        file_put_contents($path, $header.$directory.$data);

        return $path;
    }

    /**
     * Blue square with the white washing-machine mark, drawn 4× larger then scaled down
     * so the edges are smooth.
     */
    private function icon(int $size, bool $rounded): GdImage
    {
        $scale = 4;
        $big = $size * $scale;
        $image = $this->canvas($big, $big, transparent: $rounded);

        $blue = $this->color($image, self::BLUE);
        if ($rounded) {
            $this->roundedRect($image, 0, 0, $big, $big, (int) ($big * 0.22), $blue);
        } else {
            imagefilledrectangle($image, 0, 0, $big, $big, $blue);
        }

        $padding = (int) round($big * 0.16);
        $this->drawMark($image, $padding, $padding, $big - 2 * $padding, light: false);

        $result = $this->canvas($size, $size, transparent: true);
        imagecopyresampled($result, $image, 0, 0, 0, 0, $size, $size, $big, $big);

        return $result;
    }

    /**
     * The logo mark (same shape as resources/js/components/app-logo-icon.tsx): a washing
     * machine with a round door. $light = white tile with blue machine.
     */
    private function drawMark(GdImage $image, int $x, int $y, int $size, bool $light): void
    {
        $u = $size / 40;
        $fg = $this->color($image, $light ? self::BLUE : [255, 255, 255]);
        $bg = $this->color($image, $light ? [255, 255, 255] : self::BLUE);

        if ($light) {
            // White rounded tile behind the blue machine.
            $this->roundedRect($image, $x - (int) (4 * $u), $y - (int) (4 * $u), $x + (int) (44 * $u), $y + (int) (44 * $u), (int) (10 * $u), $bg);
        }

        $px = fn (float $value) => (int) round($value * $u);

        // Machine body.
        $this->roundedRect($image, $x + $px(6), $y + $px(3), $x + $px(34), $y + $px(37), $px(5), $fg);
        // Door ring (cut out) with the glass in the middle.
        imagefilledellipse($image, $x + $px(20), $y + $px(22), $px(20), $px(20), $bg);
        imagefilledellipse($image, $x + $px(20), $y + $px(22), $px(12), $px(12), $fg);
        // Control knobs and display.
        imagefilledellipse($image, $x + $px(11), $y + $px(8.5), $px(3.2), $px(3.2), $bg);
        imagefilledellipse($image, $x + $px(15.5), $y + $px(8.5), $px(3.2), $px(3.2), $bg);
        imagefilledrectangle($image, $x + $px(24), $y + $px(7.5), $x + $px(30), $y + $px(9.5), $bg);
    }

    private function canvas(int $width, int $height, bool $transparent = false): GdImage
    {
        $image = imagecreatetruecolor(max($width, 1), max($height, 1));

        if ($image === false) {
            throw new RuntimeException('GD could not create an image.');
        }

        imageantialias($image, true);

        if ($transparent) {
            imagealphablending($image, false);
            imagesavealpha($image, true);
            imagefill($image, 0, 0, (int) imagecolorallocatealpha($image, 0, 0, 0, 127));
            imagealphablending($image, true);
        }

        return $image;
    }

    /**
     * @param  array{int, int, int}  $rgb  0–255 per channel (out-of-range values are clamped)
     * @param  int  $alpha  0 (opaque) – 127 (transparent)
     */
    private function color(GdImage $image, array $rgb, int $alpha = 0): int
    {
        $channel = fn (int $value) => max(0, min(255, $value));

        return (int) imagecolorallocatealpha($image, $channel($rgb[0]), $channel($rgb[1]), $channel($rgb[2]), max(0, min(127, $alpha)));
    }

    /**
     * @param  array{int, int, int}  $from
     * @param  array{int, int, int}  $to
     * @return array{int, int, int}
     */
    private function mix(array $from, array $to, float $amount): array
    {
        return [
            (int) round($from[0] + ($to[0] - $from[0]) * $amount),
            (int) round($from[1] + ($to[1] - $from[1]) * $amount),
            (int) round($from[2] + ($to[2] - $from[2]) * $amount),
        ];
    }

    /**
     * Soft glow: stacked translucent circles, most transparent at the edge.
     *
     * @param  array{int, int, int}  $rgb
     */
    private function glow(GdImage $image, int $cx, int $cy, int $radius, array $rgb): void
    {
        for ($r = $radius; $r > 0; $r -= 6) {
            imagefilledellipse($image, $cx, $cy, $r * 2, $r * 2, $this->color($image, $rgb, 124));
        }
    }

    private function roundedRect(GdImage $image, int $x1, int $y1, int $x2, int $y2, int $radius, int $color): void
    {
        $radius = max(0, min($radius, (int) (($x2 - $x1) / 2), (int) (($y2 - $y1) / 2)));

        imagefilledrectangle($image, $x1 + $radius, $y1, $x2 - $radius, $y2, $color);
        imagefilledrectangle($image, $x1, $y1 + $radius, $x2, $y2 - $radius, $color);

        foreach ([[$x1 + $radius, $y1 + $radius], [$x2 - $radius, $y1 + $radius], [$x1 + $radius, $y2 - $radius], [$x2 - $radius, $y2 - $radius]] as [$cx, $cy]) {
            imagefilledellipse($image, $cx, $cy, $radius * 2, $radius * 2, $color);
        }
    }

    /**
     * DejaVu ships with dompdf, so the font is always available on the server.
     */
    private function font(string $file): string
    {
        $path = base_path("vendor/dompdf/dompdf/lib/fonts/{$file}");

        if (! is_file($path)) {
            throw new RuntimeException("Font not found: {$path}");
        }

        return $path;
    }

    /**
     * Word-wrap text to a pixel width (at most two lines; the rest is cut with an ellipsis).
     *
     * @return list<string>
     */
    private function wrap(string $text, string $font, int $size, int $maxWidth): array
    {
        $lines = [];
        $line = '';

        foreach (preg_split('/\s+/', trim($text)) ?: [] as $word) {
            $candidate = $line === '' ? $word : "{$line} {$word}";
            $box = imagettfbbox($size, 0, $font, $candidate);

            if ($box !== false && $maxWidth < $box[2] - $box[0] && $line !== '') {
                $lines[] = $line;
                $line = $word;
            } else {
                $line = $candidate;
            }
        }

        if ($line !== '') {
            $lines[] = $line;
        }

        if (count($lines) > 2) {
            $lines = [$lines[0], rtrim($lines[1]).'…'];
        }

        return $lines;
    }

    private function ensureDirectory(string $path): void
    {
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0755, true);
        }
    }

    /**
     * 09171234567 → 0917 123 4567 (other formats are left as typed).
     */
    private function formatPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        return preg_match('/^09\d{9}$/', $digits) === 1
            ? substr($digits, 0, 4).' '.substr($digits, 4, 3).' '.substr($digits, 7)
            : $phone;
    }
}
