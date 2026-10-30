<?php

namespace App\Services;

use App\Models\Order;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * QR codes for order tags. Uses bacon/bacon-qr-code directly (the library Fortify already
 * ships) instead of simplesoftwareio/simple-qrcode, which is abandoned and pins an older
 * bacon version that conflicts with Fortify's two-factor authentication.
 */
class QrCodeService
{
    public function svg(string $content, int $size = 200): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle($size, 1), new SvgImageBackEnd)))->writeString($content);

        // Drop the XML declaration so the SVG can be inlined in HTML.
        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }

    /**
     * Data URI for <img> tags — this is what DomPDF needs to render the code in PDFs.
     */
    public function dataUri(string $content, int $size = 200): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($this->svg($content, $size));
    }

    /**
     * The staff tag on the laundry bag opens the scan page (login required).
     */
    public function orderTagUrl(Order $order): string
    {
        return route('scan.show', $order->order_number);
    }
}
