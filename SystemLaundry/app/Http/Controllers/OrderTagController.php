<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Setting;
use App\Services\QrCodeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class OrderTagController extends Controller
{
    /**
     * 4 x 3 inch label stuck on the laundry bag. Staff scan its QR code to update the status,
     * which prevents bags from being mixed up between customers.
     */
    public function show(Order $order, QrCodeService $qr): Response
    {
        $order->load(['customer:id,name,phone', 'items']);

        return Pdf::loadView('pdf.tag', [
            'order' => $order,
            'qr' => $qr->dataUri($qr->orderTagUrl($order), 220),
            'shopName' => Setting::get('shop_name'),
        ])
            ->setPaper([0, 0, 288, 216]) // 4 in x 3 in
            ->stream("tag-{$order->order_number}.pdf");
    }
}
